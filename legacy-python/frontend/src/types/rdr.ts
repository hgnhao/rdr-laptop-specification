/**
 * Definisi Type TypeScript untuk Sistem Pakar RDR Laptop
 * Selaras dengan Schema Pydantic Backend (src/models.py)
 */

export interface Case {
  budget: number; // Dalam Juta Rupiah (misal 12.5)
  ram_gb: number; // 4, 8, 16, 32, 64
  weight_kg: number; // Berat laptop dalam kg
  battery_hours: number; // Jam ketahanan baterai
  primary_usage: string; // 'Office / School', 'Programming / Data Science', dll.
  gpu_required: string; // 'Integrated', 'Dedicated Entry', dll.
  screen_type: string; // 'Standard FHD', 'IPS FHD', 'OLED', dll.
}

export interface Condition {
  attribute: string;
  operator: ">" | "<" | "==" | ">=" | "<=" | "!=";
  value: string | number | boolean;
}

export interface RDRNode {
  id: string;
  conditions: Condition[];
  conclusion: string;
  cornerstone_case?: Case | null;
  right_child?: RDRNode | null;
  false_child?: RDRNode | null;
}

export interface InferenceStep {
  node_id: string;
  node_conclusion: string;
  conditions_evaluated: string;
  is_satisfied: boolean;
  branch_taken: string;
  updated_conclusion: boolean;
  description: string;
}

export interface InferenceResult {
  final_conclusion: string;
  last_satisfied_node: RDRNode;
  steps: InferenceStep[];
}

export interface DifferentiatingAttribute {
  attribute: string;
  label: string;
  is_numeric: boolean;
  new_value: any;
  cornerstone_value: any;
  suggested_conditions: Condition[];
}

export interface TreeResponse {
  metadata: {
    total_nodes: number;
    max_depth: number;
    root_id: string;
  };
  tree: RDRNode;
  nodes_flat: {
    id: string;
    conclusion: string;
    conditions: string[];
    has_cornerstone: boolean;
    right_child_id: string | null;
    false_child_id: string | null;
  }[];
  mermaid_markdown: string;
}

