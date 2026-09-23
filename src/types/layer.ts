export type LayerStatus = "ACTIVE" | "INACTIVE";

export type Layer = {
  id: string;
  bayId: string;
  name: string;
  code: string;
  status: LayerStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateLayerInput = {
  bayId: string;
  name: string;
  code: string;
};

export type UpdateLayerInput = {
  name?: string;
  code?: string;
  status?: LayerStatus;
};
