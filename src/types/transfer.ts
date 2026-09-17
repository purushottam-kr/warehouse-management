export type CreateTransferInput = {
  itemId: string;
  fromStorageSpaceId: string;
  toStorageSpaceId: string;
  quantity: string;
};

export type TransferResult = {
  itemId: string;
  fromStorageSpaceId: string;
  toStorageSpaceId: string;
  quantity: string;
};