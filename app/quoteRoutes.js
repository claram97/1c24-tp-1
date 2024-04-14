const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/quote', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.quotable.io/quotes/random`);

        const quote = result.data.map(quote => ({
                      quote: quote.content,
                      author: quote.author
                    }));

        res.status(200).json(quote[0]);
      } catch (error) {
        console.error('Error obteniendo resultado desde quotable:', error);
        res.status(500).send('Error when retrieving quote, contact your service administrator');
      }
});

module.exports = router;
