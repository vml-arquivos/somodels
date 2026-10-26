export const accountTermsVersion = "2026-10-26";
export const accountTermsTitle = "Termos de conta, maioridade e autorização";
export const accountTermsClauses = [
  "Declaro ter 18 anos ou mais e capacidade legal para usar a plataforma.",
  "Declaro que sou responsável pelos dados e conteúdos que eu enviar ou possuir autorização expressa para administrá-los.",
  "Declaro que não enviarei conteúdo de menores, não consensual, ilícito, fraudulento ou que viole direitos de terceiros.",
] as const;

export const accountTermsText = [
  accountTermsTitle,
  `Versão ${accountTermsVersion}`,
  ...accountTermsClauses.map((clause, index) => `${index + 1}. ${clause}`),
].join("\n\n");
