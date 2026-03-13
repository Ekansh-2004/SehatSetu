import * as cheerio from 'cheerio';

async function scrapeWiki() {
  try {
    const res = await fetch('https://en.wikipedia.org/wiki/Healthcare_in_India');
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    
    // Find all h3 tags and get the following paragraphs
    $('h3').each((i, el) => {
        const title = $(el).find('.mw-headline').text().trim();
        let desc = '';
        let nextEl = $(el).next();
        
        while(nextEl.length > 0 && nextEl[0].name !== 'h3' && nextEl[0].name !== 'h2') {
            if(nextEl[0].name === 'p') {
                desc += nextEl.text().trim() + ' ';
            }
            nextEl = nextEl.next();
        }
        
        if(title && desc.length > 20 && title.toLowerCase().includes('scheme') || title.toLowerCase().includes('yojana') || title.toLowerCase().includes('mission') || title.toLowerCase().includes('program')) {
            results.push({ 
                title: title, 
                description: desc.substring(0, 150) + '...',
                category: "Health Program",
                eligibility: "Indian Citizens",
                coverage: "Varies",
                benefits: ["Health Coverage", "Government Support"]
            });
        }
    });

    console.log("Found:", results.length);
    console.log(results.slice(0, 3));
  } catch (err) {
    console.error(err);
  }
}
scrapeWiki();
