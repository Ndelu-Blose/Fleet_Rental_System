export const SA_BANKS = [
  { name: "ABSA", code: "632005" },
  { name: "Capitec Bank", code: "470010" },
  { name: "FNB (First National Bank)", code: "250655" },
  { name: "Standard Bank", code: "051001" },
  { name: "Nedbank (Savings)", code: "198765" },
  { name: "Nedbank (Cheque)", code: "147105" },
  { name: "Investec", code: "580105" },
  { name: "Discovery Bank", code: "679000" },
  { name: "TymeBank", code: "678910" },
  { name: "Bank Zero", code: "888000" },
  { name: "African Bank", code: "430000" },
  { name: "Bidvest Bank", code: "462005" },
  { name: "Albaraka Bank", code: "800000" },
  { name: "Citibank", code: "350005" },
  { name: "State Bank of India", code: "801000" },
  { name: "Pep Bank", code: "400001" },
] as const;

export function getBankCode(bankName: string): string | undefined {
  const bank = SA_BANKS.find((b) => b.name === bankName);
  return bank?.code;
}

export function getBankName(bankCode: string): string | undefined {
  const bank = SA_BANKS.find((b) => b.code === bankCode);
  return bank?.name;
}

