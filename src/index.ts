import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import liquidityRoutes from './routes/liquidity';
import { specs } from './config/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(
	'/docs',
	swaggerUi.serve,
	swaggerUi.setup(specs, {
		customSiteTitle: 'Liquidity Service API Documentation',
		customCss: '.swagger-ui .topbar { display: none }',
		customCssUrl: '',
		swaggerOptions: {
			persistAuthorization: true,
			displayRequestDuration: true,
			tryItOutEnabled: true,
		},
	})
);

app.use('/', liquidityRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get API information and documentation
 *     description: Returns general information about the API, supported chains, and available endpoints
 *     tags:
 *       - Information
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIInfoResponse'
 */
app.get('/', (req: express.Request, res: express.Response) => {
	res.json({
		name: 'Liquidity Service API',
		description: 'A microservice for calculating DEX liquidity and slippage',
		version: '1.0.0',
		endpoints: {
			'GET /liquidity': {
				description: 'Get liquidity quotes with slippage calculations',
				parameters: {
					sellToken: 'Token address to sell (required)',
					buyToken: 'Token address to buy (required)',
					chainId:
						'EVM chain ID (required - 1=Ethereum, 137=Polygon, 56=BSC, 42161=Arbitrum)',
				},
				example:
					'/liquidity?sellToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&buyToken=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chainId=1',
			},
			'GET /health': {
				description: 'Health check endpoint',
			},
		},
		supportedChains: {
			1: 'Ethereum (Uniswap V2)',
			137: 'Polygon (QuickSwap)',
			56: 'BSC (PancakeSwap)',
			42161: 'Arbitrum (SushiSwap)',
		},
	});
});

app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		console.error('Unhandled error:', err);
		res.status(500).json({
			error: 'Internal server error',
			message:
				process.env.NODE_ENV === 'development'
					? err.message
					: 'Something went wrong',
		});
	}
);

app.listen(PORT, () => {
	console.log(`Liquidity Service running on port ${PORT}`);
	console.log(`API documentation available at http://localhost:${PORT}`);
	console.log(`Swagger docs: http://localhost:${PORT}/docs`);
	console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
