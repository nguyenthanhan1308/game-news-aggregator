import { OpenAI } from 'openai';
import Parser from 'rss-parser';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

export default async function handler(req, res) {
    const feed = await parser.parseURL('https://www.dota2.com/news/rss.xml');
    const items = feed.items.map(item => ({
        title: item.title,
        content: item.contentSnippet,
        link: item.link,
        pubDate: item.pubDate,
    }));

    const saved = [];
    for (const news of items) {
        const prompt = `Title: ${news.title}\nContent: ${news.content}\n\n1. Is this a real gameplay update?\n2. If yes, summarize in 2 lines.`;

        const aiRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
        });

        const summary = aiRes.choices[0].message.content;

        const result = await addDoc(collection(db, 'game_news'), {
            ...news,
            summary,
            source: 'Dota 2',
        });

        saved.push(result.id);
    }

    res.status(200).json({ success: true, saved });
}
