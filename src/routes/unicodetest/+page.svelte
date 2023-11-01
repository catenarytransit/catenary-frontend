<script lang='ts'>
    
    let bruh="This is broken"

import { decode as decodeToAry, encode as encodeAry } from 'base65536';

const decode = (textToDecode: string) => {
		try {
			return new TextDecoder().decode(decodeToAry(textToDecode));
		} catch (e) {
			return 'Decode failed: Invalid input';
		}
	};

    bruh=decode(
						'ꉰ騮罹縱𒁪险ꌳ轳罘蹺鴲靰繩繳穭葩罩陪筪陳繪輰艈艷繄艺筮陷荘靨ꍄ荲鵄繫敮謮轤𔕰𖥊浊豧扁缭𠁎詫鐵ᕑ'
				  )
    </script>

    <h1>Unicode Test</h1>
    <p>You should see the key, if not, unicode is broken!</p>
    <p>{bruh}</p>