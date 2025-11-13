import rust from '@wasm-tool/rollup-plugin-rust';

export default {
	input: {
		foo: 'Cargo.toml'
	},
	plugins: [rust()]
};
