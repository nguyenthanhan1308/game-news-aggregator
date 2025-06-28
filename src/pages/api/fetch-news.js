import { OpenAI } from 'openai';
import FeedParser from 'feedparser';
import fetch from 'node-fetch';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const feeds = [
    { name: 'hearthstone', url: 'https://www.reddit.com/r/hearthstone/.rss' },
    { name: 'DotA2', url: 'https://www.reddit.com/r/DotA2/.rss' },
    { name: 'GlobalOffensive', url: 'https://www.reddit.com/r/GlobalOffensive/.rss' }
];

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// const app = initializeApp({
//     apiKey: process.env.FIREBASE_API_KEY,
//     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
//     projectId: process.env.FIREBASE_PROJECT_ID,
// });
// const db = getFirestore(app);

export default async function handler(req, res) {
    try {
        // Fetch & parse all feeds in parallel
        const allItems = (
            await Promise.all(
                feeds.map(async ({ name, url }) => {
                    const response = await fetch(url);
                    if (response.status !== 200) throw new Error(`Failed to fetch ${name}`);

                    const feedparser = new FeedParser();
                    const items = [];

                    const streamPromise = new Promise((resolve, reject) => {
                        response.body.pipe(feedparser);

                        feedparser.on('error', reject);

                        feedparser.on('readable', function () {
                            let item;
                            while ((item = this.read())) {
                                items.push({
                                    title: item.title || 'No title',
                                    link: item.link || '',
                                    content: item.summary || '',
                                    pubDate: item.pubDate || '',
                                    subreddit: name
                                });
                            }
                        });

                        feedparser.on('end', resolve);
                    });

                    await streamPromise;
                    return items;
                })
            )
        ).flat(); // Merge all arrays into one

        // Optional: sort by date (most recent first)
        allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        res.status(200).json({ success: true, items: allItems });
    } catch (err) {
        console.error('API error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
    // const items = feed.items.map(item => ({
    //     title: item.title,
    //     content: item.contentSnippet,
    //     link: item.link,
    //     pubDate: item.pubDate,
    // }));

    // const saved = [];
    // for (const news of items) {
    //     const prompt = `Title: ${news.title}\nContent: ${news.content}\n\n1. Is this a real gameplay update?\n2. If yes, summarize in 2 lines.`;

    //     const aiRes = await openai.chat.completions.create({
    //         model: 'gpt-4o',
    //         messages: [{ role: 'user', content: prompt }],
    //     });

    //     const summary = aiRes.choices[0].message.content;

    //     const result = await addDoc(collection(db, 'game_news'), {
    //         ...news,
    //         summary,
    //         source: 'Dota 2',
    //     });

    //     saved.push(result.id);
    // }

    // res.status(200).json({ success: true, saved });
}
