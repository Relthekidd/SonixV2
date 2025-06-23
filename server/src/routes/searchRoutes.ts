import express from 'express';
import { SearchController } from '@/controllers/searchController';

const router = express.Router();

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search for tracks, artists, albums, and playlists
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, tracks, artists, albums, playlists]
 *           default: all
 *         description: Type of content to search
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results per category
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tracks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Track'
 *                     artists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Artist'
 *                     albums:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Album'
 *                     playlists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Playlist'
 *                 query:
 *                   type: string
 *                 type:
 *                   type: string
 *       400:
 *         description: Missing search query
 */
router.get('/', SearchController.search);

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for suggestions
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [track, artist, album]
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                 query:
 *                   type: string
 *       400:
 *         description: Missing search query
 */
router.get('/suggestions', SearchController.getSuggestions);

/**
 * @swagger
 * /search/trending:
 *   get:
 *     summary: Get trending searches
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of trending searches
 *     responses:
 *       200:
 *         description: Trending searches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/trending', SearchController.getTrendingSearches);

export default router;