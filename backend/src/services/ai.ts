import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateTaskSummary(requiredTaskId: number): Promise<string> {
  const rt = db.prepare('SELECT * FROM required_tasks WHERE id = ?').get(requiredTaskId) as any;
  if (!rt) return 'No task found.';

  const history = db.prepare(`
    SELECT st.work_description, st.problems, st.actual_hours, st.completed_at,
      (SELECT COUNT(*) FROM task_crew tc WHERE tc.scheduled_task_id = st.id) as crew_count
    FROM scheduled_tasks st
    WHERE st.required_task_id = ? AND st.state = 'completed'
    ORDER BY st.completed_at DESC LIMIT 10
  `).all(requiredTaskId) as any[];

  if (history.length === 0) return 'No completion history available yet. Be the first to complete this task and add your insights!';

  const historyText = history.map((h: any, i: number) => `
Execution ${i + 1} (${h.completed_at ? h.completed_at.split('T')[0] : 'unknown date'}):
- Work done: ${h.work_description || 'Not recorded'}
- Problems encountered: ${h.problems || 'None reported'}
- Actual hours: ${h.actual_hours || 'Not recorded'}
- Team size: ${h.crew_count} people
`).join('\n');

  const prompt = `You are analyzing execution history for a community disaster preparedness task to help future volunteers perform it better.

Task: ${rt.short_description}
Description: ${rt.overview}

Previous Execution History:
${historyText}

Please provide concise, practical guidance covering:
1. Key tips for successfully completing this task
2. Common problems and how to avoid or handle them
3. Typical time and team size needed based on history
4. Any important patterns or insights

Keep the response under 300 words. Write in plain text, no markdown formatting. Focus on practical advice that helps volunteers succeed.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    return (response.content[0] as any).text;
  } catch (error) {
    console.error('AI summary error:', error);
    return 'AI summary temporarily unavailable. Please check task history manually.';
  }
}
