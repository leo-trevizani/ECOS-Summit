/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Visitor {
  name: string;
  cpf: string;
  balance: number;
  registeredAt: string;
}

export interface Agency {
  id: string;        // ID used for deep linking /investir/[id]
  token: string;     // Secret/Unique ID used for dashboard /agencia/[token]
  name: string;
  slogan: string;
  balance: number;   // Total ECOS credits invested in this agency
}

export interface Transaction {
  id: string;
  visitorCpf: string;
  visitorName: string;
  agencyId: string;
  agencyName: string;
  amount: number;
  timestamp: string; // ISO String or Locale formatted time
}

export interface AppState {
  currentVisitor: Visitor | null;
  visitors: Visitor[];
  agencies: Agency[];
  transactions: Transaction[];
  blacklist: string[]; // List of CPFs that cannot register
}
