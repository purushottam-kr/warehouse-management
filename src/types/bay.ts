export type BayStatus = "ACTIVE" | "INACTIVE";

export type Bay = {
  id: string;
  aisleId: string;
  name: string;
  code: string;
  status: BayStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBayInput = {
  aisleId: string;
  name: string;
  code: string;
};

export type UpdateBayInput = {
  name?: string;
  code?: string;
  status?: BayStatus;
};
