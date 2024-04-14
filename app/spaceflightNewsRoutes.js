const express = require('express');
const axios = require('axios');
const router = express.Router();

const HEADLINE_COUNT = 5;

router.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);
    try {
        const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
        const titles = [];

        result.data.results.forEach(result => {titles.push(result.title)} )

        res.status(200).json(titles);
    } catch (error) {
        console.error('Error obteniendo resultado desde spaceflightnewsapi:', error);
        res.status(500).send('Error when consulting the news, contact your service administrator');
    }
});

module.exports = router;
