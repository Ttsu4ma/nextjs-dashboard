'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// フォームの元スキーマ
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

// 新規作成用（id, date は DB 側で作る）
const CreateInvoice = FormSchema.omit({ id: true, date: true });
// 更新用（同じく id, date 以外を受け取る）
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// --------------------
// 新規作成 createInvoice
// --------------------
export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Database Error (createInvoice):', error);
    throw new Error('Failed to create invoice.');
  }

  // redirect は try/catch の外に出す（エラーとして投げるため）
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// --------------------
// 更新 updateInvoice
// --------------------
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId},
          amount = ${amountInCents},
          status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Database Error (updateInvoice):', error);
    throw new Error('Failed to update invoice.');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// --------------------
// 削除 deleteInvoice
// --------------------
// export async function deleteInvoice(id: string) {
//   try {
//     await sql`DELETE FROM invoices WHERE id = ${id}`;
//   } catch (error) {
//     console.error('Database Error (deleteInvoice):', error);
//     throw new Error('Failed to delete invoice.');
//   }

//   revalidatePath('/dashboard/invoices');
// }
export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    console.error('Database Error (deleteInvoice):', error);
    throw new Error('Failed to delete invoice.');
  }

  revalidatePath('/dashboard/invoices');
}