const url = 'https://something.com'

async function fetchData(url) {
    const data = await fetch(url)
    console.log(await data.text())
}
fetchData(url)

