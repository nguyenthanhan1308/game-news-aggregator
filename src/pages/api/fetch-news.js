import FeedParser from 'feedparser';
import fetch from 'node-fetch';

const feeds = [
    {
        name: 'Hearthstone',
        url: 'https://www.reddit.com/r/hearthstone/.rss'
    },
    {
        name: 'DotA2',
        url: 'https://www.reddit.com/r/DotA2/.rss'
    },
    {
        name: 'GlobalOffensive',
        url: 'https://www.reddit.com/r/GlobalOffensive/.rss'
    },
    {
        name: 'Wuthering Waves',
        url: 'https://www.reddit.com/r/WutheringWaves/.rss'
    },
];
let cachedItems = null;
let lastFetch = 0;

export default async function handler(req, res) {
    try {
        if (Date.now() - lastFetch < 60 * 1000 && cachedItems) {
            return res.status(200).json({ success: true, items: cachedItems });
        }
        // Fetch & parse all feeds in parallel
        const allItems = (
            await Promise.all(
                feeds.map(async ({ name, url }) => {
                    const response = await fetch(url);
                    if (response.status !== 200) throw new Error(`Failed to fetch ${name}`);

                    const feedParser = new FeedParser();
                    const items = [];

                    const streamPromise = new Promise((resolve, reject) => {
                        response.body.pipe(feedParser);

                        feedParser.on('error', reject);

                        feedParser.on('readable', function () {
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

                        feedParser.on('end', resolve);
                    });

                    await streamPromise;
                    return items;
                })
            )
        ).flat(); // Merge all arrays into one

        // Optional: sort by date (most recent first)
        allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        cachedItems = allItems;
        lastFetch = Date.now();
        // res.status(200).json({ success: true, saved });
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

    
}
