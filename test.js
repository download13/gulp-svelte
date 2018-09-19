'use strict';

const {resolve} = require('path');
const {PassThrough} = require('stream');

const File = require('vinyl');
const noop = require('lodash/noop');
const test = require('tape');
const svelte = require('.');
const {VERSION} = require('svelte');

const expected = `/* generated by Svelte v${VERSION} */\n\nfunction create_m`;

test('gulp-svelte', t => {
	t.plan(13);

	svelte()
	.on('error', t.fail)
	.on('data', file => {
		t.deepEqual(file, new File(), 'should read null file as it is.');
	})
	.end(new File());

	svelte()
	.on('error', t.fail)
	.on('data', ({contents}) => {
		t.equal(
			contents.toString().substr(0, expected.length),
			expected,
			'should transform HTML with Svelte.'
		);
	})
	.end(new File({
		contents: Buffer.from('<p></p>')
	}));

	svelte({css: false})
	.on('error', t.fail)
	.on('data', ({path, contents}) => {
		if (path.endsWith('js')) {
			t.equal(
				path,
				resolve('index.js'),
				'should replace the existing file extension with `.js`.'
			);

			t.notOk(
				contents.includes('ghostwhite'),
				'should remove CSS from Svelte source when `css` option is `false`.'
			);

			return;
		}

		t.equal(
			path,
			resolve('index.css'),
			'should emit a CSS file when `css` option is `false`.'
		);
	})
	.end(new File({
		path: resolve('index.html'),
		contents: Buffer.from('<style>*{color:ghostwhite}</style><b></b>')
	}));

	svelte({
		css: false,
		onwarn({code}) {
			t.equal(
				code,
				'css-unused-selector',
				'should support compiler options'
			);
		}
	})
	.on('error', t.fail)
	.end(new File({contents: Buffer.from('<style>*{}</style>')}));

	svelte()
	.on('error', err => {
		t.equal(
			err.message,
			'Expected valid tag name',
			'should emit an error when it cannot parse the file.'
		);
		t.notOk(
			'fileName' in err,
			'should not include `fileName` property to the error when the object doesn\'t have filename.'
		);
	})
	.end(new File({contents: Buffer.from('</>')}));

	svelte()
	.on('error', ({fileName}) => {
		t.equal(
			fileName,
			resolve('tmp.html'),
			'should include `fileName` property to the error when the object have filename.'
		);
	})
	.end(new File({
		path: resolve('tmp.html'),
		contents: Buffer.from('<a//>')
	}));

	let count = 0;

	svelte({onerror: noop})
	.on('data', () => count++)
	.on('error', t.fail)
	.end(new File({contents: Buffer.from('{')}), () => {
		t.equal(
			count,
			0,
			'should emit no files when an error occured but was handled by `onerror`.'
		);
	});

	svelte()
	.on('error', ({message}) => {
		t.equal(
			message,
			'Streaming not supported',
			'should emit an error when it takes a stream-mode file.'
		);
	})
	.end(new File({contents: new PassThrough()}));

	svelte()
	.on('error', ({message}) => {
		t.equal(
			message,
			'gulp-svelte doesn\'t support gulp <= v3.x. Update your project to use gulp >= v4.0.0.',
			'should emit an error when it takes a Vinyl but it\'s not created by vinyl 2.x.'
		);
	})
	.end({isNull: noop});

	svelte()
	.on('error', ({message}) => {
		t.equal(
			message,
			'Expected a Vinyl file object of a Svelte template, but got a non-Vinyl value [ \'foo\' ] (array).',
			'should emit an error when it takes a non-Vinyl object.'
		);
	})
	.end(['foo']);
});

test('Argument validation', t => {
	t.throws(
		() => svelte({}, {}),
		/Expected 0 or 1 argument \(<Object>\), but got 2 arguments\./u,
		'should throw an error when it takes too many arguments.'
	);

	t.end();
});
