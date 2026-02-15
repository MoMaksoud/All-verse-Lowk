import { DistanceUnitEnum, WeightUnitEnum } from 'shippo';
import { shippo } from '@/lib/shippo';

export interface TestLabelResult {
  label_url: string;
  tracking_number: string;
  tracking_url_provider: string;
}

export async function createTestLabel(): Promise<TestLabelResult> {
  const shipment = await shippo.shipments.create({
    addressFrom: {
      name: 'AllVerse Seller',
      street1: '4220 USF Holly Dr',
      city: 'Tampa',
      state: 'FL',
      zip: '33620',
      country: 'US',
      email: 'seller@test.com',
      phone: '8135551234',
    },
    addressTo: {
      name: 'Test Buyer',
      street1: '1600 Amphitheatre Pkwy',
      city: 'Mountain View',
      state: 'CA',
      zip: '94016',
      country: 'US',
      email: 'buyer@test.com',
    },
    parcels: [
      {
        length: '10',
        width: '8',
        height: '4',
        distanceUnit: DistanceUnitEnum.In,
        weight: '1',
        massUnit: WeightUnitEnum.Lb,
      },
    ],
    async: false,
  });

  const rates = shipment.rates ?? [];
  if (rates.length === 0) {
    throw new Error('No rates returned for the test shipment. Check carrier accounts and addresses.');
  }

  console.log(
    'SHIPPO RATES →',
    shipment.rates.map((r: { provider?: string; service?: unknown; amount?: string }) => ({
      provider: r.provider,
      service: r.service,
      amount: r.amount,
    }))
  );

  const rate =
    shipment.rates.find((r: { provider?: string }) => r.provider === 'USPS') ?? shipment.rates[0];
  const rateId = (rate as { object_id?: string; objectId: string }).object_id ?? rate.objectId;

  const transaction = await shippo.transactions.create({
    rate: rateId,
    label_file_type: 'PDF',
    async: false,
  } as Parameters<typeof shippo.transactions.create>[0]);

  type TxShape = {
    status?: string;
    object_id?: string;
    objectId?: string;
    label_url?: string;
    labelUrl?: string;
    tracking_number?: string;
    trackingNumber?: string;
    tracking_url_provider?: string;
    trackingUrlProvider?: string;
  };

  const tx = transaction as TxShape;

  console.log('SHIPPO STATUS:', tx.status);
  console.log('SHIPPO LABEL URL:', tx.label_url ?? tx.labelUrl);

  let completedTransaction = transaction as TxShape;

  if (tx.status !== 'SUCCESS') {
    const transactionId = tx.object_id ?? tx.objectId;
    if (!transactionId) {
      throw new Error('Shippo transaction missing object_id');
    }
    for (let i = 0; i < 5; i++) {
      await new Promise((res) => setTimeout(res, 1500));

      completedTransaction = (await shippo.transactions.get(transactionId)) as TxShape;

      console.log('POLL STATUS:', completedTransaction.status);

      if (completedTransaction.status === 'SUCCESS') break;
    }
  }

  if (completedTransaction.status !== 'SUCCESS') {
    throw new Error(`Shippo transaction failed: ${completedTransaction.status}`);
  }

  return {
    label_url: completedTransaction.label_url ?? completedTransaction.labelUrl ?? '',
    tracking_number: completedTransaction.tracking_number ?? completedTransaction.trackingNumber ?? '',
    tracking_url_provider:
      completedTransaction.tracking_url_provider ?? completedTransaction.trackingUrlProvider ?? '',
  };
}
