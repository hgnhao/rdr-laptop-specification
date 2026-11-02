import {
  BatteryMedium,
  BrainCircuit,
  Briefcase,
  Clapperboard,
  Cpu,
  Gamepad2,
  MemoryStick,
  Monitor,
  Wallet,
  Weight,
  type LucideIcon,
} from "lucide-react";
import type { Attribute, Usage } from "@/lib/rdr/types";

export const ATTRIBUTE_ICON: Record<Attribute, LucideIcon> = {
  budget: Wallet,
  ram_gb: MemoryStick,
  weight_kg: Weight,
  battery_hours: BatteryMedium,
  primary_usage: Briefcase,
  gpu_required: Cpu,
  screen_type: Monitor,
};

export const USAGE_ICON: Record<Usage, LucideIcon> = {
  office: Briefcase,
  gaming: Gamepad2,
  video_editing: Clapperboard,
  ai_training: BrainCircuit,
};
