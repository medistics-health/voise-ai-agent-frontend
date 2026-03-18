interface AddressLike {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export const formatFullAddress = (address: AddressLike): string => {
  const stateZip = [address.state, address.zip].filter(Boolean).join(' ');

  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    stateZip,
  ]
    .filter(Boolean)
    .join(', ');
};
