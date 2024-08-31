document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    search(query);
});

async function search(query) {
    try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while fetching results.');
    }
}

function displayResults(data) {
    const scholarResults = document.getElementById('scholarResults');
    const pubmedResults = document.getElementById('pubmedResults');
    const arxivResults = document.getElementById('arxivResults');
    const ieeeResults = document.getElementById('ieeeResults');

    scholarResults.innerHTML = '';
    pubmedResults.innerHTML = '';
    arxivResults.innerHTML = '';
    ieeeResults.innerHTML = '';

    data.google_scholar.forEach(item => {
        scholarResults.appendChild(createResultItem(item));
    });

    data.pubmed.forEach(item => {
        pubmedResults.appendChild(createResultItem(item));
    });

    data.arxiv.forEach(item => {
        arxivResults.appendChild(createResultItem(item));
    });

    data.ieee.forEach(item => {
        ieeeResults.appendChild(createResultItem(item));
    });
}

function createResultItem(item) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
        <p><strong>Author:</strong> ${item.author}</p>
        <p><strong>Year:</strong> ${item.year}</p>
    `;
    return div;
}