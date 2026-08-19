/**
 * The exact slice of three.js the parallax wall uses.
 *
 * ParallaxWall imports this module dynamically so the library is only fetched
 * by visitors who will actually render the wall. Re-exporting named bindings
 * here (rather than dynamically importing 'three' directly) keeps the imports
 * static from the bundler's point of view, so the chunk stays tree-shaken -
 * a bare `await import('three')` ships the entire library instead.
 */
export {
	CanvasTexture,
	OrthographicCamera,
	Scene,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
	TextureLoader,
	WebGLRenderer,
} from 'three';
