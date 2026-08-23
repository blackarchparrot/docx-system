import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fileName, fileBase64, user } = req.body;
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const storagePath = `uploads/${Date.now()}_${fileName}`;

    // Upload directly to Supabase Storage Bucket
    const { error: storageErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (storageErr) throw storageErr;

    const docId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Save activity in audit logs
    await supabase.from('audit_logs').insert([
      { document_id: docId, actor_name: user || 'Anonymous', event_type: 'UPLOADED_DOC', details: { path: storagePath, fileName } }
    ]);

    return res.status(200).json({ success: true, path: storagePath });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}