import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to convert "5 Apr 2026" to "2026-04-05"
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

// Helper to clean numbers like "40,000" or empty strings
function parseNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  return Number(cleaned) || 0;
}

async function runImport() {
  const fileContent = fs.readFileSync('./students.csv', 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} rows in CSV. Preparing upload...`);

  const formattedStudents = records
    .filter((row) => row['Student ID'] && row['Name']) // Skip blank rows
    .map((row) => ({
      student_id: row['Student ID'].trim(),
      full_name: row['Name'].trim(),
      father_name: row["Father's Name"] || null,
      batch_class: row['Class'] || 'Unassigned',
      medium: row['Medium'] || 'English',
      schooling: String(row['Schooling']).toLowerCase() === 'yes',
      product_detail: row['Product Detail'] || 'One Year Course',
      admission_date: parseDate(row['Date of Admission']),
      contact_number: String(row['Contact Number'] || '').replace(/\D/g, '').slice(-10) || null,
      parent_alt_number: String(row['Alt Number'] || '').replace(/\D/g, '').slice(-10) || null,
      total_fees: parseNum(row['Total Fees']),
      fee_paid_till_date: parseNum(row['Fee Paid Till Date']),
      risk_category:
        row['Category'] === 'High Risk' || row['Category'] === 'Have Left Already'
          ? row['Category']
          : 'Active',
    }));

  // Upload in batches of 200
  for (let i = 0; i < formattedStudents.length; i += 200) {
    const chunk = formattedStudents.slice(i, i + 200);
    const { error } = await supabase
      .from('students')
      .upsert(chunk, { onConflict: 'student_id' });

    if (error) {
      console.error('Error importing batch:', error.message);
    } else {
      console.log(`Uploaded students ${i + 1} to ${i + chunk.length}...`);
    }
  }

  console.log('✅ All students imported successfully!');
}

runImport();