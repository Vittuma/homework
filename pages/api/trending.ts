import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data: narratives } = await supabase
    .from('narratives')
    .select('*')
    .order('trending_score', { ascending: false })
    .limit(10)

  const { data: topCoins } = await supabase
    .from('coins')
    .select('symbol, name, score, sentiment, price, change_24h, image')
    .order('updated_at', { ascending: false })
    .limit(20)

  res.json({ narratives: narratives || [], topCoins: topCoins || [] })
}
