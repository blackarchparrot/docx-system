import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const docId = req.query.id || 'texAR2';

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('active_documents')
      .select('*')
      .eq('id', docId)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { content, user, changes } = req.body;

    // 1. Update the fixed document state
    const { error } = await supabase
      .from('active_documents')
      .upsert({ id: docId, title: 'texAR2.docx', content, updated_at: new Date() });

    if (error) return res.status(500).json({ error: error.message });

    // 2. Silently log exact additions/deletions into audit_logs
    await supabase.from('audit_logs').insert([
      { 
        document_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        actor_name: user || 'Editor', 
        event_type: 'DOC_MODIFIED', 
        details: { docId, changes } 
      }
    ]);

    return res.status(200).json({ success: true });
  }
}
