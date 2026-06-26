import { BACSBankAccount } from '@/types/woocommerce'

/**
 * 三国银行账号常量（方案2快速上线）
 * 后续可迁移到 WP 自定义端点 /api/payment/bacs/accounts
 */
export const BACS_ACCOUNTS: BACSBankAccount[] = [
  {
    country: 'GB',
    currency: 'GBP',
    accountName: 'NovaFabric Ltd',
    accountNumber: '12345678',
    sortCode: '12-34-56',
    bankName: 'Barclays Bank',
    iban: 'GB29 NWBK 6016 1331 9268 19',
    swift: 'NWBKGB2L',
    instructions: 'Please include order number as payment reference. Processing time: 1-3 business days.',
  },
  {
    country: 'DE',
    currency: 'EUR',
    accountName: 'NovaFabric GmbH',
    iban: 'DE89 3704 0044 0532 0130 00',
    swift: 'COBADEFFXXX',
    bankName: 'Commerzbank',
    instructions: 'Bitte verwenden Sie die Bestellnummer als Verwendungszweck. Bearbeitungszeit: 1-3 Werktage.',
  },
  {
    country: 'US',
    currency: 'USD',
    accountName: 'NovaFabric Inc',
    accountNumber: '000123456789',
    routingNumber: '021000021',
    bankName: 'JPMorgan Chase',
    instructions: 'Please include order number as payment reference. Processing time: 1-5 business days.',
  },
]

/**
 * 根据币种获取对应的银行账号
 * GBP → 英国账号，EUR → 德国账号，USD → 美国账号
 */
export function getBACSAccountByCurrency(currency: string): BACSBankAccount | undefined {
  return BACS_ACCOUNTS.find((account) => account.currency === currency.toUpperCase())
}

/**
 * 获取所有支持的币种列表
 */
export function getSupportedBACSCurrencies(): string[] {
  return BACS_ACCOUNTS.map((account) => account.currency)
}
