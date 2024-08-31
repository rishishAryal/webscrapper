const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function scrapeGoogleScholar(query) {
    try {
        const url = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);

        const results = [];

        $('.gs_r.gs_or.gs_scl').each((i, element) => {
            const titleElement = $(element).find('.gs_rt a');
            const metaElement = $(element).find('.gs_a');

            const title = titleElement.text().trim() || 'No title available';
            const link = titleElement.attr('href') || 'No link available';
            const metaInfo = metaElement.text().trim() || 'No meta information available';

            const metaMatch = metaInfo.match(/^(.*?)\s*-\s*(.*?),\s*(\d{4})/);
            const author = metaMatch ? metaMatch[1].split(',')[0].trim() : 'Unknown author';
            const year = metaMatch ? metaMatch[3] : 'Unknown year';

            results.push({ title, link, author, year });
        });

        return results;
    } catch (error) {
        console.error('Error scraping Google Scholar:', error);
        return [];
    }
}

async function scrapePubMed(query) {
    try {
        const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);

        const results = [];

        $('article.full-docsum').each((i, element) => {
            const titleElement = $(element).find('a.docsum-title');
            const authorsElement = $(element).find('.full-authors');
            const yearElement = $(element).find('.docsum-journal-citation');

            const title = titleElement.text().trim() || 'No title available';
            const link = titleElement.attr('href') ? `https://pubmed.ncbi.nlm.nih.gov${titleElement.attr('href')}` : 'No link available';
            const author = authorsElement.text().split(',')[0].trim() || 'Unknown author';
            const yearMatch = yearElement.text().match(/\b\d{4}\b/);
            const year = yearMatch ? yearMatch[0] : 'Unknown year';

            results.push({ title, link, author, year });
        });

        return results;
    } catch (error) {
        console.error('Error scraping PubMed:', error);
        return [];
    }
}
async function scrapeArXiv(query) {
    try {
        const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data, { xmlMode: true });

        const results = [];

        $('entry').each((i, element) => {
            const title = $(element).find('title').text().trim();
            const link = $(element).find('id').text().trim();
            const authors = $(element).find('author name').map((i, el) => $(el).text()).get().join(', ');
            const published = $(element).find('published').text().trim().split('T')[0];

            results.push({
                title,
                link,
                author: authors,
                year: published.split('-')[0]
            });
        });

        return results;
    } catch (error) {
        console.error('Error scraping arXiv:', error);
        return [];
    }
}
async function scrapeIEEE(query) {
    try {
        const url = `https://ieeexplore.ieee.org/rest/search`;
        const response = await axios.post(url, {
            queryText: query,
            highlight: true,
            returnFacets: ["ALL"],
            returnType: "SEARCH",
            matchPubs: true,
            rowsPerPage: 10
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://ieeexplore.ieee.org',
                'Referer': 'https://ieeexplore.ieee.org/search/searchresult.jsp'
            }
        });

        const results = response.data.records.map(record => ({
            title: record.articleTitle,
            link: `https://ieeexplore.ieee.org${record.documentLink}`,
            author: record.authors.map(author => author.preferredName).join(', '),
            year: record.publicationYear
        }));

        return results;
    } catch (error) {
        console.error('Error scraping IEEE:', error);
        return [];
    }
}

app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const [googleScholarResults, pubMedResults, arXivResults, ieeeResults] = await Promise.all([
            scrapeGoogleScholar(query),
            scrapePubMed(query),
            scrapeArXiv(query),
            scrapeIEEE(query)
        ]);

        res.json({
            google_scholar: googleScholarResults,
            pubmed: pubMedResults,
            arxiv: arXivResults,
            ieee: ieeeResults
        });
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

// app.get('/search', async (req, res) => {
//     const query = req.query.q;
//     if (!query) {
//         return res.status(400).json({ error: 'Query parameter "q" is required' });
//     }

//     try {
//         const [googleScholarResults, pubMedResults] = await Promise.all([
//             scrapeGoogleScholar(query),
//             scrapePubMed(query)
//         ]);

//         res.json({
//             google_scholar: googleScholarResults,
//             pubmed: pubMedResults
//         });
//     } catch (error) {
//         console.error('Error in search:', error);
//         res.status(500).json({ error: 'An error occurred while processing your request' });
//     }
// });

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});