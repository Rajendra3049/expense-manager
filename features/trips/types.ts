export type TripRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  note: string;
  budget: string | number;
  created_at: string;
  updated_at: string;
};

export type TripBudgetAdjustmentRow = {
  id: string;
  trip_id: string;
  trip_name_snapshot: string;
  direction: "credit" | "debit";
  amount: string | number;
  note: string | null;
  effective_date: string;
  created_at: string;
};
