const express = require('express');
const axios = require('axios');
const router = express.Router();

const HEADLINE_COUNT = 5;

// Función para obtener los titulares de noticias sobre el espacio
const getSpaceflightNews = async () => {
    const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
    return result.data.results.map(result => result.title);
};

// Manejador de errores
const errorHandler = (error, res) => {
    console.error('Error obteniendo resultado desde spaceflightnewsapi:', error);
    res.status(500).send('Error when consulting the news, contact your service administrator');
};

router.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const titles = await getSpaceflightNews();
        res.status(200).json(titles);
    } catch (error) {
        errorHandler(error, res);
    }
});

module.exports = router;
