import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const docId = req.query.id || 'texAR2';

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('active_documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || { content: '<h1>texAR2 Workspace</h1><p>Start typing...</p>' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { content, user, changes } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content payload is empty.' });
      }

      // Upsert document content
      const { error: docErr } = await supabase
        .from('active_documents')
        .upsert({ id: docId, title: 'texAR2.docx', content, updated_at: new Date() }, { onConflict: 'id' });

      if (docErr) return res.status(500).json({ error: docErr.message });

      // Insert silent diff log
      await supabase.from('audit_logs').insert([
        { 
          document_id: docId, 
          actor_name: user || 'Editor', 
          event_type: 'DOC_MODIFIED', 
          details: { docId, changes } 
        }
      ]);

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
