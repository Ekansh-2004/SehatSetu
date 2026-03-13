import * as cheerio from 'cheerio';

async function testScrape() {
  try {
    const res = await fetch('https://www.india.gov.in/my-government/schemes');
    const html = await res.text();
    const $ = cheerio.load(html);
    const schemes = [];
    $('.views-row').each((i, el) => {
      const title = $(el).find('h3').text().trim() || $(el).find('a').text().trim();
      const desc = $(el).find('.field-content').text().trim();
      if(title && title.length > 5 && !schemes.find(s => s.title === title)) {
        schemes.push({ title, description: desc.substring(0, 150) });
      }
    });
    console.log(JSON.stringify(schemes.slice(0, 10), null, 2));
  } catch (err) {
    console.error(err);
  }
}
testScrape();
