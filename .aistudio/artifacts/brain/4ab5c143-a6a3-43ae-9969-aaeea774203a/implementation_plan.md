# Geofencing e Raio de Alcance no Expo PP

Adição de controle de geolocalização para validação de presença física nos investimentos do Expo PP, com configuração centralizada no console do administrador (endereço, coordenadas, raio customizável em metros e toggle de ativação) e validação em tempo real no dispositivo do participante.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas com base nas respostas fornecidas:
> - **Tamanho do raio:** Customizável em metros no console do administrador (com atalhos rápidos e campo numérico).
> - **Regra de bloqueio:** O participante pode navegar e visualizar livremente o aplicativo (carteira, agências, extrato), mas o investimento via QR Code é bloqueado se estiver fora do raio ou sem permissão de GPS.
> - **Definição do ponto central:** O administrador pode digitar o endereço com busca automática de coordenadas ou clicar em "Usar Minha Localização Atual" para captura instantânea via GPS.

---

## 1. Overview & Core Concept

- **O que faz:** Permite que a organização da Expo PP delimite geograficamente onde os investimentos são válidos. Se a função estiver ativa, qualquer tentativa de ler o QR Code ou investir nas agências verificará se as coordenadas do aparelho estão dentro da distância limite estipulada em relação ao local do evento.
- **Público-alvo:** Administradores do evento (para configurar endereço e ligar/desligar o modo teste) e Visitantes/Alunos (que usam o app presencialmente no estande).
- **Valor agregado:** Elimina fraudes de investimento remoto e garante auditoria física do público sem prejudicar a navegação básica ou o período de testes e preparação.

---

## 2. User Experience & Visual Design

### Fluxo no Console do Administrador (AdminConsole)
1. Nova aba **"📍 Geolocalização"** na barra de navegação administrativa.
2. **Switch / Toggle de Ativação:** Indicador claro de status ("✅ Validação Ativa" vs "🟡 Desativada / Modo de Testes").
3. **Formulário de Localização Central:**
   - Campo de Endereço com botão "Buscar Coordenadas" (geocodificação via Nominatim/OSM com cache).
   - Botão de ação rápida "📍 Usar Minha Localização Atual" (captura a latitude/longitude do GPS do administrador na hora).
   - Exibição de Latitude, Longitude e Precisão.
4. **Definição de Raio (em metros):**
   - Campo numérico livre (ex: 200m, 350m).
   - Chips de seleção rápida: `100m` · `250m` · `500m` · `1.000m`.
5. **Card de Diagnóstico & Teste:**
   - Mostra a distância em metros do dispositivo atual do administrador até o ponto central configurado, informando se o próprio administrador estaria dentro ou fora do perímetro.
6. **Persistência em Tempo Real:** Salvo no Firestore (`config/geofence`), refletindo instantaneamente em todos os celulares dos visitantes conectados.

### Fluxo no Dispositivo do Participante (WalletScreen)
1. **Visualização:** O usuário acessa normalmente sua carteira, vê seu saldo de créditos e o histórico de investimentos.
2. **Ação de Investir (Clique em "Escanear QR Code"):**
   - Se o toggle estiver desligado: o fluxo segue normalmente sem checagem de GPS.
   - Se o toggle estiver ativo:
     - O app solicita/verifica a permissão do GPS (`navigator.geolocation`).
     - Calcula a distância exata em metros utilizando a **fórmula de Haversine**.
     - **Se estiver dentro do raio:** O leitor de QR Code abre imediatamente.
     - **Se estiver fora do raio:** Exibe modal ilustrado com alerta de segurança:
       *"Você está fora da área do evento. Para investir na agência, você precisa estar no local da Expo PP. Distância atual: X metros (Raio permitido: Y metros)."* Oferece botão para "Verificar Novamente".
     - **Se a permissão for negada:** Modal instrutivo explicando que a geolocalização é necessária para validar a presença no evento, com instruções de como permitir.

---

## 3. Key Product Decisions & Trade-Offs

- **Cálculo de Distância:**
  - *Abordagem:* Fórmula esférica de Haversine implementada no cliente em TypeScript puro, com verificação de acurácia do GPS.
  - *Vantagem:* Cálculo ultrarrápido (sub-milissegundo), sem requisições adicionais a APIs externas por leitura de QR Code, preservando quota e funcionando mesmo com conexões instáveis no pavilhão do evento.
- **Geocodificação de Endereço:**
  - *Abordagem:* Endpoint público de busca de endereços (OpenStreetMap / Nominatim) com fallback para preenchimento manual ou botão "Usar Minha Localização Atual".
  - *Vantagem:* Não requer chaves de API pagas ou cartões de crédito para buscar endereços no console do admin.
- **Toggle para Modo de Testes:**
  - Permite aos organizadores preparar as agências e testar os QR Codes de casa ou no escritório antes do dia da abertura sem serem bloqueados pelo GPS.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Firestore Database                   │
│               Collection: config/geofence              │
│  { enabled, address, latitude, longitude, radiusMeters }│
└──────────────────────────┬─────────────────────────────┘
                           │ Real-time Listener (onSnapshot)
                           ▼
┌────────────────────────────────────────────────────────┐
│                  React AppContext                      │
│  - geofenceConfig: GeofenceConfig                      │
│  - updateGeofenceConfig(config)                        │
│  - checkVisitorLocation(): Promise<LocationCheckResult>│
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       AdminConsole.tsx       │ │       WalletScreen.tsx       │
│ - Toggle Liga/Desliga        │ │ - Botão "Escanear QR Code"   │
│ - Input de Endereço + Busca  │ │ - Checagem Haversine         │
│ - Botão "GPS Atual do Admin" │ │ - Modal Informativo de       │
│ - Slider/Input Raio (metros) │ │   Bloqueio se fora do raio   │
│ - Simulador de Distância     │ │ - Acesso livre ao restante   │
└──────────────────────────────┘ └──────────────────────────────┘
```

### Modelo de Dados (`src/types.ts`)

```typescript
export interface GeofenceConfig {
  enabled: boolean;
  address: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  updatedAt?: string;
}

export interface LocationCheckResult {
  allowed: boolean;
  distanceMeters?: number;
  reason?: 'out_of_bounds' | 'permission_denied' | 'gps_unavailable' | 'ok';
}
```

### Regras de Segurança no Firestore (`firestore.rules`)
Garantir que o documento `config/geofence` possua leitura liberada para os visitantes sincronizarem a regra e gravação liberada para o console administrativo.

---

## 5. Verification Plan

1. **Testes do Console Administrativo:**
   - Habilitar e desabilitar o toggle de geolocalização e verificar a sincronização imediata.
   - Digitar um endereço de teste e validar a conversão em latitude/longitude.
   - Clicar no botão "Usar Minha Localização Atual" e verificar se preenche as coordenadas reais do navegador.
   - Alterar o raio para diferentes valores (ex: 50m, 300m, 1000m) e salvar.
2. **Testes da Carteira e Validação no Dispositivo:**
   - Com a geolocalização ativa e raio curto (fora da posição atual), tentar clicar em "Escanear QR Code" e comprovar a exibição do modal de bloqueio.
   - Testar o botão "Verificar Novamente".
   - Ajustar o ponto central para a posição real do usuário e comprovar que o leitor de QR Code abre perfeitamente.
   - Desativar o toggle e confirmar que qualquer usuário consegue escanear sem restrições.
3. **Build & Linting:**
   - Executar `lint_applet` e `compile_applet` para assegurar que não haja erros de tipo ou compilação.
