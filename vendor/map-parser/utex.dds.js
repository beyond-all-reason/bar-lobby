// https://github.com/photopea/UTEX.js

const UTEX = {};

UTEX.readATC = function(data, offset, img, w, h) {
    var pos = {boff: offset*8};
    var sqr = new Uint8Array(4*4*4);

    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.readATCcolor(data, offset, sqr);
            UTEX.write4x4(img, w, h, x, y, sqr);
            offset += 8;
        }
    }
    return offset;
};
UTEX.readATA = function(data, offset, img, w, h) {
    var pos = {boff: offset*8};
    var sqr = new Uint8Array(4*4*4);

    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.readATCcolor(data, offset+8, sqr);
            /*
				for(var i=0; i<64; i+=4) {
					var code = UTEX.readBits(data, pos, 4);
					sqr[i+3] = 255*(code/15);
				}
				*/
            UTEX.write4x4(img, w, h, x, y, sqr);
            offset += 16;  pos.boff+=64;
        }
    }
    return offset;
};
UTEX.readBC1 = function(data, offset, img, w, h) {
    var sqr = new Uint8Array(4*4*4);

    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.readBCcolor(data, offset, sqr);
            UTEX.write4x4(img, w, h, x, y, sqr);
            offset += 8;
        }
    }
    return offset;
};
UTEX.writeBC1 = function(img, w, h, data, offset) {
    var sqr = new Uint8Array(16*4);
    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.read4x4(img, w, h, x, y, sqr);
            UTEX.writeBCcolor(data, offset, sqr);
            offset+=8;
        }
    }
    return offset;
};
UTEX.readBC2 = function(data, offset, img, w, h) {
    var pos = {boff: offset*8};
    var sqr = new Uint8Array(4*4*4);

    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.readBCcolor(data, offset+8, sqr);
            for (var i=0; i<64; i+=4) {
                var code = UTEX.readBits(data, pos, 4);
                sqr[i+3] = 255*(code/15);
            }
            UTEX.write4x4(img, w, h, x, y, sqr);
            offset += 16;  pos.boff+=64;
        }
    }
    return offset;
};

UTEX.inter8 = function(a, b) {
    var al = [ a, b ];

    if ( a > b ) {
        al.push(
            6/7*a + 1/7*b, // bit code 010
            5/7*a + 2/7*b, // bit code 011
            4/7*a + 3/7*b, // bit code 100
            3/7*a + 4/7*b, // bit code 101
            2/7*a + 5/7*b, // bit code 110
            1/7*a + 6/7*b  );
    } else {
        al.push(
            4/5*a + 1/5*b, // bit code 010
            3/5*a + 2/5*b, // bit code 011
            2/5*a + 3/5*b, // bit code 100
            1/5*a + 4/5*b, // bit code 101
            0,                     // bit code 110
            255            );
    }
    return al;
};

UTEX.readBC3 = function(data, offset, img, w, h) {
    var pos = {boff: offset*8};
    var sqr = new Uint8Array(4*4*4);

    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.readBCcolor(data, offset+8, sqr);

            var al = UTEX.inter8(data[offset], data[offset+1]);	pos.boff+=16;
            for (var i=0; i<64; i+=4) {
                var code = UTEX.readBits(data, pos, 3);
                sqr[i+3] = al[code];
            }
            pos.boff+=64;
            UTEX.write4x4(img, w, h, x, y, sqr);
            offset += 16;
        }
    }
    return offset;
};
UTEX.writeBC3 = function(img, w, h, data, offset) {
    var sqr = new Uint8Array(16*4);
    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            UTEX.read4x4(img, w, h, x, y, sqr);
            var min=sqr[3], max=sqr[3];
            for (var i=7; i<64; i+=4) {
                var a = sqr[i];  if (a<min) {
                    min=a;
                }  else if (max<a) {
                    max=a;
                }
            }
            data[offset]=max;  data[offset+1]=min;  offset+=2;

            var al = UTEX.inter8(max, min);
            var boff = (offset+2)<<3;
            for (var i=0; i<64; i+=32) {
                var bits=0, boff=0;
                for (var j=0; j<32; j+=4) {
                    var code = 0, cd=500;
                    var a=sqr[i+j+3];
                    for (var k=0; k<8; k++) {
                        var dst=Math.abs(al[k]-a);  if (dst<cd) {
                            cd=dst;  code=k;
                        }
                    }
                    bits = bits|(code<<boff);  boff+=3;
                }
                data[offset]=(bits);  data[offset+1]=(bits>>8);  data[offset+2]=(bits>>16);
                offset+=3;
            }

            UTEX.writeBCcolor(data, offset, sqr);
            offset+=8;
        }
    }
    return offset;
};

UTEX._arr16 = new Uint8Array(16);
UTEX.readATCcolor = function(data, offset, sqr) {
    var c0 = (data[offset+1]<<8)|data[offset  ];
    var c1 = (data[offset+3]<<8)|data[offset+2];

    var c0b = (c0&31)*(255/31), c0g = ((c0>>>5)&31)*(255/31), c0r = (c0>>10)*(255/31);
    var c1b = (c1&31)*(255/31), c1g = ((c1>>>5)&63)*(255/63), c1r = (c1>>11)*(255/31);

    var clr = UTEX._arr16;
    clr[ 0] = ~~(c0r);  clr[ 1] = ~~(c0g);  clr[ 2] = ~~(c0b);  clr[ 3] = 255;
    clr[12] = ~~(c1r);  clr[13] = ~~(c1g);  clr[14] = ~~(c1b);  clr[15] = 255;
    var fr = 2/3, ifr = 1-fr;
    clr[ 4] = ~~(fr*c0r + ifr*c1r);  clr[ 5] = ~~(fr*c0g + ifr*c1g);  clr[ 6] = ~~(fr*c0b + ifr*c1b);  clr[ 7] = 255;
    fr = 1/3;  ifr=1-fr;
    clr[ 8] = ~~(fr*c0r + ifr*c1r);  clr[ 9] = ~~(fr*c0g + ifr*c1g);  clr[10] = ~~(fr*c0b + ifr*c1b);  clr[11] = 255;

    UTEX.toSquare(data, sqr, clr, offset);
};
UTEX.readBCcolor = function(data, offset, sqr) {
    var c0 = (data[offset+1]<<8)|data[offset  ];
    var c1 = (data[offset+3]<<8)|data[offset+2];

    var c0b = (c0&31)*(255/31), c0g = ((c0>>>5)&63)*(255/63), c0r = (c0>>11)*(255/31);
    var c1b = (c1&31)*(255/31), c1g = ((c1>>>5)&63)*(255/63), c1r = (c1>>11)*(255/31);

    var clr = UTEX._arr16;
    clr[0] = ~~(c0r);  clr[1] = ~~(c0g);  clr[2] = ~~(c0b);  clr[3] = 255;
    clr[4] = ~~(c1r);  clr[5] = ~~(c1g);  clr[6] = ~~(c1b);  clr[7] = 255;
    if (c1<c0) {
        var fr = 2/3, ifr = 1-fr;
        clr[ 8] = ~~(fr*c0r + ifr*c1r);  clr[ 9] = ~~(fr*c0g + ifr*c1g);  clr[10] = ~~(fr*c0b + ifr*c1b);  clr[11] = 255;
        fr = 1/3;  ifr=1-fr;
        clr[12] = ~~(fr*c0r + ifr*c1r);  clr[13] = ~~(fr*c0g + ifr*c1g);  clr[14] = ~~(fr*c0b + ifr*c1b);  clr[15] = 255;
    } else {
        var fr = 1/2, ifr = 1-fr;
        clr[ 8] = ~~(fr*c0r + ifr*c1r);  clr[ 9] = ~~(fr*c0g + ifr*c1g);  clr[10] = ~~(fr*c0b + ifr*c1b);  clr[11] = 255;
        clr[12] = 0;  clr[13] = 0;  clr[14] = 0;  clr[15] = 0;
    }
    UTEX.toSquare(data, sqr, clr, offset);
};
UTEX.writeBCcolor = function(data, offset, sqr) {
    var dist = UTEX.colorDist;
    var ends = UTEX.mostDistant(sqr);

    var c0r = sqr[(ends >>8)], c0g = sqr[(ends >>8)+1], c0b = sqr[(ends >>8)+2] ;
    var c1r = sqr[(ends&255)], c1g = sqr[(ends&255)+1], c1b = sqr[(ends&255)+2] ;

    var c0 =  ( ( c0r >> 3 ) << 11 ) | ( ( c0g >> 2 ) << 5 ) | ( c0b >> 3 );
    var c1 =  ( ( c1r >> 3 ) << 11 ) | ( ( c1g >> 2 ) << 5 ) | ( c1b >> 3 );
    if (c0<c1) {
        var t=c0;  c0=c1;  c1=t;
    }

    var c0b = Math.floor((c0&31)*(255/31)), c0g = Math.floor(((c0>>>5)&63)*(255/63)), c0r = Math.floor((c0>>11)*(255/31));
    var c1b = Math.floor((c1&31)*(255/31)), c1g = Math.floor(((c1>>>5)&63)*(255/63)), c1r = Math.floor((c1>>11)*(255/31));

    data[offset+0]=(c0&255);  data[offset+1] = (c0>>8);
    data[offset+2]=(c1&255);  data[offset+3] = (c1>>8);

    var fr = 2/3, ifr = 1-fr;
    var c2r = Math.floor(fr*c0r + ifr*c1r), c2g = Math.floor(fr*c0g + ifr*c1g), c2b = Math.floor(fr*c0b + ifr*c1b);
    fr = 1/3;  ifr=1-fr;
    var c3r = Math.floor(fr*c0r + ifr*c1r), c3g = Math.floor(fr*c0g + ifr*c1g), c3b = Math.floor(fr*c0b + ifr*c1b);


    var boff = offset*8+32;
    for (var i=0; i<64; i+=4) {
        var r=sqr[i], g=sqr[i+1], b=sqr[i+2];

        var ds0 = dist(r, g, b, c0r, c0g, c0b);
        var ds1 = dist(r, g, b, c1r, c1g, c1b);
        var ds2 = dist(r, g, b, c2r, c2g, c2b);
        var ds3 = dist(r, g, b, c3r, c3g, c3b);
        var dsm = Math.min(ds0, Math.min(ds1, Math.min(ds2, ds3)));

        var code=0;
        if (dsm===ds1) {
            code=1;
        } else if (dsm===ds2) {
            code=2;
        } else if (dsm===ds3) {
            code=3;
        }

        data[boff>>3] |= (code<<(boff&7));
        boff+=2;
    }
};
UTEX.toSquare = function(data, sqr, clr, offset) {
    var boff = (offset+4)<<3;
    for (var i=0; i<64; i+=4) {
        var code = ((data[boff>>3]>>((boff&7)))&3);  boff+=2;
        code = (code<<2);
        sqr[i  ] = clr[code  ];
        sqr[i+1] = clr[code+1];
        sqr[i+2] = clr[code+2];
        sqr[i+3] = clr[code+3];
    }
};

UTEX.read4x4 = function(a, w, h, sx, sy, b) {
    for (var y=0; y<4; y++) {
        var si = ((sy+y)*w+sx)<<2, ti = y<<4;
        b[ti+ 0] = a[si+ 0];  b[ti+ 1] = a[si+ 1];  b[ti+ 2] = a[si+ 2];  b[ti+ 3] = a[si+ 3];
        b[ti+ 4] = a[si+ 4];  b[ti+ 5] = a[si+ 5];  b[ti+ 6] = a[si+ 6];  b[ti+ 7] = a[si+ 7];
        b[ti+ 8] = a[si+ 8];  b[ti+ 9] = a[si+ 9];  b[ti+10] = a[si+10];  b[ti+11] = a[si+11];
        b[ti+12] = a[si+12];  b[ti+13] = a[si+13];  b[ti+14] = a[si+14];  b[ti+15] = a[si+15];
    }
};
UTEX.write4x4 = function(a, w, h, sx, sy, b) {
    for (var y=0; y<4; y++) {
        var si = ((sy+y)*w+sx)<<2, ti = y<<4;
        a[si+ 0] = b[ti+ 0];  a[si+ 1] = b[ti+ 1];  a[si+ 2] = b[ti+ 2];  a[si+ 3] = b[ti+ 3];
        a[si+ 4] = b[ti+ 4];  a[si+ 5] = b[ti+ 5];  a[si+ 6] = b[ti+ 6];  a[si+ 7] = b[ti+ 7];
        a[si+ 8] = b[ti+ 8];  a[si+ 9] = b[ti+ 9];  a[si+10] = b[ti+10];  a[si+11] = b[ti+11];
        a[si+12] = b[ti+12];  a[si+13] = b[ti+13];  a[si+14] = b[ti+14];  a[si+15] = b[ti+15];
    }
};

UTEX._subs2 = ["0011001100110011", "0001000100010001", "0111011101110111", "0001001100110111", "0000000100010011", "0011011101111111", "0001001101111111", "0000000100110111", "0000000000010011", "0011011111111111", "0000000101111111", "0000000000010111", "0001011111111111", "0000000011111111", "0000111111111111", "0000000000001111", "0000100011101111", "0111000100000000", "0000000010001110", "0111001100010000", "0011000100000000", "0000100011001110", "0000000010001100", "0111001100110001", "0011000100010000", "0000100010001100", "0110011001100110", "0011011001101100", "0001011111101000", "0000111111110000", "0111000110001110", "0011100110011100", "0101010101010101", "0000111100001111", "0101101001011010", "0011001111001100", "0011110000111100", "0101010110101010", "0110100101101001", "0101101010100101", "0111001111001110", "0001001111001000", "0011001001001100", "0011101111011100", "0110100110010110", "0011110011000011", "0110011010011001", "0000011001100000", "0100111001000000", "0010011100100000", "0000001001110010", "0000010011100100", "0110110010010011", "0011011011001001", "0110001110011100", "0011100111000110", "0110110011001001", "0110001100111001", "0111111010000001", "0001100011100111", "0000111100110011", "0011001111110000", "0010001011101110", "0100010001110111"];
UTEX._subs3 = ["0011001102212222", "0001001122112221", "0000200122112211", "0222002200110111", "0000000011221122", "0011001100220022", "0022002211111111", "0011001122112211", "0000000011112222", "0000111111112222", "0000111122222222", "0012001200120012", "0112011201120112", "0122012201220122", "0011011211221222", "0011200122002220", "0001001101121122", "0111001120012200", "0000112211221122", "0022002200221111", "0111011102220222", "0001000122212221", "0000001101220122", "0000110022102210", "0122012200110000", "0012001211222222", "0110122112210110", "0000011012211221", "0022110211020022", "0110011020022222", "0011012201220011", "0000200022112221", "0000000211221222", "0222002200120011", "0011001200220222", "0120012001200120", "0000111122220000", "0120120120120120", "0120201212010120", "0011220011220011", "0011112222000011", "0101010122222222", "0000000021212121", "0022112200221122", "0022001100220011", "0220122102201221", "0101222222220101", "0000212121212121", "0101010101012222", "0222011102220111", "0002111200021112", "0000211221122112", "0222011101110222", "0002111211120002", "0110011001102222", "0000000021122112", "0110011022222222", "0022001100110022", "0022112211220022", "0000000000002112", "0002000100020001", "0222122202221222", "0101222222222222", "0111201122012220"];
UTEX._anch2 = [[0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 2, 0], [0, 8, 0], [0, 2, 0], [0, 2, 0], [0, 8, 0], [0, 8, 0], [0, 15, 0], [0, 2, 0], [0, 8, 0], [0, 2, 0], [0, 2, 0], [0, 8, 0], [0, 8, 0], [0, 2, 0], [0, 2, 0], [0, 15, 0], [0, 15, 0], [0, 6, 0], [0, 8, 0], [0, 2, 0], [0, 8, 0], [0, 15, 0], [0, 15, 0], [0, 2, 0], [0, 8, 0], [0, 2, 0], [0, 2, 0], [0, 2, 0], [0, 15, 0], [0, 15, 0], [0, 6, 0], [0, 6, 0], [0, 2, 0], [0, 6, 0], [0, 8, 0], [0, 15, 0], [0, 15, 0], [0, 2, 0], [0, 2, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 15, 0], [0, 2, 0], [0, 2, 0], [0, 15, 0]];
UTEX._anch3 = [[0, 3, 15], [0, 3, 8], [0, 15, 8], [0, 15, 3], [0, 8, 15], [0, 3, 15], [0, 15, 3], [0, 15, 8], [0, 8, 15], [0, 8, 15], [0, 6, 15], [0, 6, 15], [0, 6, 15], [0, 5, 15], [0, 3, 15], [0, 3, 8], [0, 3, 15], [0, 3, 8], [0, 8, 15], [0, 15, 3], [0, 3, 15], [0, 3, 8], [0, 6, 15], [0, 10, 8], [0, 5, 3], [0, 8, 15], [0, 8, 6], [0, 6, 10], [0, 8, 15], [0, 5, 15], [0, 15, 10], [0, 15, 8], [0, 8, 15], [0, 15, 3], [0, 3, 15], [0, 5, 10], [0, 6, 10], [0, 10, 8], [0, 8, 9], [0, 15, 10], [0, 15, 6], [0, 3, 15], [0, 15, 8], [0, 5, 15], [0, 15, 3], [0, 15, 6], [0, 15, 6], [0, 15, 8], [0, 3, 15], [0, 15, 3], [0, 5, 15], [0, 5, 15], [0, 5, 15], [0, 8, 15], [0, 5, 15], [0, 10, 15], [0, 5, 15], [0, 10, 15], [0, 8, 15], [0, 13, 15], [0, 15, 3], [0, 12, 15], [0, 3, 15], [0, 3, 8]];

UTEX.readBC7 = function(data, offset, img, w, h) {
    var rB = UTEX.readBits;
    var pos = {boff: 0};
    var sqr = new Uint8Array(4*4*4);

    var intp = [null, null,
        [0, 21, 43, 64],
        [0, 9, 18, 27, 37, 46, 55, 64],
        [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64]
    ];

    var subs = [ null, null, UTEX._subs2, UTEX._subs3 ];
    var ancs = [ null, null, UTEX._anch2, UTEX._anch3 ];

    for (var y=0; y<h; y+=4) {
        for (var x=0; x<w; x+=4) {
            var mode = 0;
            while (((data[offset]>>mode)&1)!==1) {
                mode++;
            }

            pos.boff  = (offset<<3)+mode+1;

            var rot  = (mode===4 || mode===5) ? rB(data, pos, 2) : 0;
            var indx = (mode===4) ? rB(data, pos, 1) : 0;

            var prtlen = [4, 6, 6, 6, 0, 0, 0, 6][mode];
            var parti = rB(data, pos, prtlen);

            var clen = [4, 6, 5, 7, 5, 7, 7, 5][mode];
            var alen = [0, 0, 0, 0, 6, 8, 7, 5][mode];
            var plen = [1, 1, 0, 1, 0, 0, 1, 1][mode];
            var pnts = [6, 4, 6, 4, 2, 2, 2, 4][mode];

            var clr = [];

            for (var i=0; i<4; i++) {
                var len = i===3?alen:clen;
                for (var j=0; j<pnts; j++) {
                    clr[i*pnts+j] = rB(data, pos, len);
                }
            }

            for (var j=0; j<pnts; j++) {
                if (mode===1 && ((j&1)===1)) {
                    pos.boff--;
                }  // Ps shared per subset
                var bit = rB(data, pos, plen);
                for (var i=0; i<3; i++) {
                    clr[i*pnts+j] = (clr[i*pnts+j]<<plen)|bit;
                }
                if (alen!==0) {
                    clr[3*pnts+j] = (clr[3*pnts+j]<<plen)|bit;
                }
            }
            clen+=plen;  if (alen!==0) {
                alen+=plen;
            }

            for (var i=0; i<4; i++) {
                var len = i===3?alen:clen;
                var cf = len===0 ? 0 : 1/((1<<len)-1);
                for (var j=0; j<pnts; j++) {
                    clr[i*pnts+j] *= cf;
                }
            }
            if (alen===0) {
                for (var j=0; j<pnts; j++) {
                    clr[3*pnts+j] = 1;
                }
            }

            var scnt = [3, 2, 3, 2, 1, 1, 1, 2][mode];	// subset count
            var cind = [3, 3, 2, 2, 2, 2, 4, 2][mode];
            var aind = [0, 0, 0, 0, 3, 2, 0, 0][mode];

            var smap = "0000000000000000";
            var anci = [0, 0, 0];
            if (scnt!==1) {
                smap = subs[scnt][parti];
                anci = ancs[scnt][parti];
            }

            var coff = pos.boff;
            var aoff = coff + 16 * cind - scnt;
            if (indx===1) {
                var t=coff;  coff=aoff;  aoff=t;  t=cind;  cind=aind;  aind=t;
            }

            var cint = intp[cind];
            pos.boff = coff;

            for (var i=0; i<64; i+=4) {
                var ss = smap.charCodeAt(i>>2)-48;
                var first = anci[ss]===(i>>2) ? 1 : 0;
                var code = rB(data, pos, cind-first);

                var f = cint[code]/64;
                var r = (1-f)*clr[0*pnts + 2*ss + 0] + f*clr[0*pnts + 2*ss + 1];
                var g = (1-f)*clr[1*pnts + 2*ss + 0] + f*clr[1*pnts + 2*ss + 1];
                var b = (1-f)*clr[2*pnts + 2*ss + 0] + f*clr[2*pnts + 2*ss + 1];
                var a = (1-f)*clr[3*pnts + 2*ss + 0] + f*clr[3*pnts + 2*ss + 1];

                sqr[i  ] = r*255;
                sqr[i+1] = g*255;
                sqr[i+2] = b*255;
                sqr[i+3] = a*255;
            }

            cint = intp[aind];
            pos.boff = aoff;

            if (aind!==0) {
                for (var i=0; i<64; i+=4) {
                    var ss = smap.charCodeAt(i>>2)-48;
                    var first = anci[ss]===(i>>2) ? 1 : 0;
                    var code = rB(data, pos, aind-first);

                    var f = cint[code]/64;
                    var a = (1-f)*clr[3*pnts + 2*ss + 0] + f*clr[3*pnts + 2*ss + 1];
                    sqr[i+3] = a*255;
                }
            }


            UTEX.rotate(sqr, rot);
            UTEX.write4x4(img, w, h, x, y, sqr);

            offset += 16;
        }
    }
    return offset;
};
UTEX.rotate = function(sqr, rot) {
    if (rot===0) {
        return;
    }
    for (var i=0; i<64; i+=4) {
        var r=sqr[i  ];
        var g=sqr[i+1];
        var b=sqr[i+2];
        var a=sqr[i+3];

        if (rot===1) {
            var t=a; a=r; r=t;
        }
        if (rot===2) {
            var t=a; a=g; g=t;
        }
        if (rot===3) {
            var t=a; a=b; b=t;
        }

        sqr[i  ] = r;
        sqr[i+1] = g;
        sqr[i+2] = b;
        sqr[i+3] = a;
    }
};

UTEX.readBits = function(data, pos, k) {
    var out = 0, ok=k;
    while (k!==0) {
        out = (out) | (UTEX.readBit(data, pos)<<(ok-k));  k--;
    }
    return out;
};
UTEX.readBit = function(data, pos) {
    var boff = pos.boff;  pos.boff++;
    return ((data[boff>>3]>>((boff&7)))&1);
};
UTEX.mipmapB = function(buff, w, h) {
    var nw = w>>1, nh = h>>1;
    var nbuf = new Uint8Array(nw*nh*4);
    for (var y=0; y<nh; y++) {
        for (var x=0; x<nw; x++) {
            var ti = (y*nw+x)<<2, si = ((y<<1)*w+(x<<1))<<2;
            //nbuf[ti  ] = buff[si  ];  nbuf[ti+1] = buff[si+1];  nbuf[ti+2] = buff[si+2];  nbuf[ti+3] = buff[si+3];
            //*
            var a0 = buff[si+3], a1 =  buff[si+7];
            var r = buff[si  ]*a0 + buff[si+4]*a1;
            var g = buff[si+1]*a0 + buff[si+5]*a1;
            var b = buff[si+2]*a0 + buff[si+6]*a1;

            si+=(w<<2);

            var a2 = buff[si+3], a3 = buff[si+7];
            r    += buff[si  ]*a2 + buff[si+4]*a3;
            g    += buff[si+1]*a2 + buff[si+5]*a3;
            b    += buff[si+2]*a2 + buff[si+6]*a3;


            var a = (a0+a1+a2+a3+2)>>2, ia = (a===0) ? 0 : 0.25/a;
            nbuf[ti  ] = ~~(r*ia+0.5);
            nbuf[ti+1] = ~~(g*ia+0.5);
            nbuf[ti+2] = ~~(b*ia+0.5);
            nbuf[ti+3] = a;
        }
    }
    return nbuf;
};
UTEX.colorDist = function(r, g, b, r0, g0, b0) {
    return (r-r0)*(r-r0)+(g-g0)*(g-g0)+(b-b0)*(b-b0);
};

UTEX.mostDistant = function(sqr) {
    var dist = UTEX.colorDist;
    var ends = 0, dd = 0;
    for (var i=0; i<64; i+=4) {
        var r = sqr[i], g = sqr[i+1], b = sqr[i+2];
        for (var j=i+4; j<64; j+=4) {
            var dst = dist(r, g, b, sqr[j], sqr[j+1], sqr[j+2]);
            if (dst>dd) {
                dd=dst;  ends=(i<<8)|j;
            }
        }
    }
    return ends;
};
UTEX.U = {
    _int8: new Uint8Array(4),
    readUintLE: function(buff, p) {
        UTEX.U._int8[0] = buff[p+0];
        UTEX.U._int8[1] = buff[p+1];
        UTEX.U._int8[2] = buff[p+2];
        UTEX.U._int8[3] = buff[p+3];
        return UTEX.U._int[0];
    },
    writeUintLE: function(buff, p, n) {
        UTEX.U._int[0] = n;
        buff[p+0] = UTEX.U._int8[0];
        buff[p+1] = UTEX.U._int8[1];
        buff[p+2] = UTEX.U._int8[2];
        buff[p+3] = UTEX.U._int8[3];
    },
    readASCII: function(buff, p, l) {
        var s = "";
        for (var i=0; i<l; i++) {
            s += String.fromCharCode(buff[p+i]);
        }
        return s;
    },
    writeASCII: function(buff, p, s) {
        for (var i = 0; i < s.length; i++) {
            buff[p+i] = s.charCodeAt(i);
        }
    }
};
UTEX.U._int = new Uint32Array(UTEX.U._int8.buffer);


UTEX.DDS = {
    C: {
        DDSD_CAPS: 0x1,  // always	// header flags
        DDSD_HEIGHT: 0x2,  // always
        DDSD_WIDTH: 0x4,  // always
        DDSD_PITCH: 0x8,
        DDSD_PIXELFORMAT: 0x1000,	// always
        DDSD_MIPMAPCOUNT: 0x20000,
        DDSD_LINEARSIZE: 0x80000,
        DDSD_DEPTH: 0x800000,

        DDPF_ALPHAPIXELS: 0x1,	// pixel format flags
        DDPF_ALPHA: 0x2,
        DDPF_FOURCC: 0x4,
        DDPF_RGB: 0x40,
        DDPF_YUV: 0x200,
        DDPF_LUMINANCE: 0x20000,

        DDSCAPS_COMPLEX: 0x8,
        DDSCAPS_MIPMAP: 0x400000,
        DDSCAPS_TEXTURE: 0x1000
    },

    decode: function(buff) {
        var data = new Uint8Array(buff), offset = 0;
        var mgck = UTEX.U.readASCII(data, offset, 4);  offset+=4;

        var head, pf, hdr10, C = UTEX.DDS.C;

        head = UTEX.DDS.readHeader(data, offset);  offset += 124;
        pf = head.pixFormat;
        if ( (pf.flags&C.DDPF_FOURCC) && pf.fourCC==="DX10") {
            hdr10 = UTEX.DDS.readHeader10(data, offset);  offset+=20;
        }
        //console.log(head, pf);

        var w = head.width, h = head.height, out = [];
        var fmt = pf.fourCC, bc  = pf.bitCount;

        //var time = Date.now();
        var mcnt = Math.max(1, head.mmcount);
        for (var it=0; it<mcnt; it++) {
            var img = new Uint8Array(w * h * 4);
            if (false) {} else if (fmt==="DXT1") {
                offset=UTEX.readBC1(data, offset, img, w, h);
            } else if (fmt==="DXT3") {
                offset=UTEX.readBC2(data, offset, img, w, h);
            } else if (fmt==="DXT5") {
                offset=UTEX.readBC3(data, offset, img, w, h);
            } else if (fmt==="DX10") {
                offset=UTEX.readBC7(data, offset, img, w, h);
            } else if (fmt==="ATC ") {
                offset=UTEX.readATC(data, offset, img, w, h);
            } else if (fmt==="ATCA") {
                offset=UTEX.readATA(data, offset, img, w, h);
            } else if (fmt==="ATCI") {
                offset=UTEX.readATA(data, offset, img, w, h);
            } else if ((pf.flags&C.DDPF_ALPHAPIXELS) && (pf.flags&C.DDPF_RGB)) {
                if     (bc===32) {
                    for (var i=0; i<img.length; i++) {
                        img[i] = data[offset+i];
                    }
                    offset+=img.length;
                } else if (bc===16) {
                    for (var i=0; i<img.length; i+=4) {
                        var clr = (data[offset+(i>>1)+1]<<8) | data[offset+(i>>1)];
                        img[i+0] = 255*(clr&pf.RMask)/pf.RMask;
                        img[i+1] = 255*(clr&pf.GMask)/pf.GMask;
                        img[i+2] = 255*(clr&pf.BMask)/pf.BMask;
                        img[i+3] = 255*(clr&pf.AMask)/pf.AMask;
                    }
                    offset+=(img.length>>1);
                } else {
                    throw ("unknown bit count "+bc);
                }
            } else if ((pf.flags&C.DDPF_ALPHA) || (pf.flags&C.DDPF_ALPHAPIXELS) || (pf.flags&C.DDPF_LUMINANCE)) {
                if (bc===8)  {
                    for (var i=0; i<img.length; i+=4) {
                        img[i+3] = data[offset+(i>>2)];
                    }
                    offset+=(img.length>>2);
                } else {
                    throw "unknown bit count "+bc;
                }
            } else {
                console.log("unknown texture format, head flags: ", head.flags.toString(2), "pixelFormat flags: ", pf.flags.toString(2));
                throw "e";
            }
            out.push({width: w, height: h, image: img.buffer});
            w = (w>>1);  h = (h>>1);
        }
        //console.log(Date.now()-time);  throw "e";
        return out; //out.slice(0,1);
    },

    encode: function(img, w, h) {
        var img = new Uint8Array(img);
        var aAnd = 255;
        for (var i=3; i<img.length; i+=4) {
            aAnd &= img[i];
        }
        var gotAlpha = aAnd<250;

        var data = new Uint8Array(124+(w*h*2)), offset = 0;
        UTEX.U.writeASCII(data, offset, "DDS ");                offset+=  4;
        UTEX.DDS.writeHeader(data, w, h, gotAlpha, offset);  offset+=124;

        var mcnt = 0;
        while (w*h!==0) {
            if (gotAlpha) {
                offset = UTEX.writeBC3(img, w, h, data, offset);
            } else         {
                offset = UTEX.writeBC1(img, w, h, data, offset);
            }
            img = UTEX.mipmapB(img, w, h);
            w = (w>>1);  h = (h>>1);
            mcnt++;
        }
        data[28] = mcnt;

        return data.buffer.slice(0, offset);
    },

    readHeader: function(data, offset) {
        var hd = {}, rUi = UTEX.U.readUintLE;
        offset+=4;	// size = 124
        hd.flags    = rUi(data, offset);  offset+=4;
        hd.height   = rUi(data, offset);  offset+=4;
        hd.width    = rUi(data, offset);  offset+=4;
        hd.pitch    = rUi(data, offset);  offset+=4;
        hd.depth    = rUi(data, offset);  offset+=4;
        hd.mmcount  = rUi(data, offset);  offset+=4;
        offset+=11*4;	// reserved, zeros
        hd.pixFormat= UTEX.DDS.readPixFormat(data, offset);  offset+=32;
        hd.caps     = rUi(data, offset);  offset+=4;
        hd.caps2    = rUi(data, offset);  offset+=4;
        hd.caps3    = rUi(data, offset);  offset+=4;
        hd.caps4    = rUi(data, offset);  offset+=4;
        offset+=4;  // reserved, zeros
        return hd;
    },
    writeHeader: function(data, w, h, gotAlpha, offset) {
        var wUi = UTEX.U.writeUintLE, C = UTEX.DDS.C;
        var flgs = C.DDSD_CAPS | C.DDSD_HEIGHT | C.DDSD_WIDTH | C.DDSD_PIXELFORMAT;
        flgs |= C.DDSD_MIPMAPCOUNT | C.DDSD_LINEARSIZE;

        var caps = C.DDSCAPS_COMPLEX | C.DDSCAPS_MIPMAP | C.DDSCAPS_TEXTURE;
        var pitch = ((w*h)>>1)*(gotAlpha?2:1), depth = gotAlpha ? 1 : 0;

        wUi(data, offset,    124);  offset+=4;
        wUi(data, offset,   flgs);  offset+=4;  // flags
        wUi(data, offset,      h);  offset+=4;
        wUi(data, offset,      w);  offset+=4;
        wUi(data, offset,  pitch);  offset+=4;
        wUi(data, offset,  depth);  offset+=4;
        wUi(data, offset,     10);  offset+=4;
        offset+=11*4;
        UTEX.DDS.writePixFormat(data, gotAlpha, offset);  offset+=32;
        wUi(data, offset,   caps);  offset+=4;  // caps
        offset += 4*4;
    },

    readPixFormat: function(data, offset) {
        var pf = {}, rUi = UTEX.U.readUintLE;
        offset+=4;  // size = 32
        pf.flags    = rUi(data, offset);  offset+=4;
        pf.fourCC   = UTEX.U.readASCII(data, offset, 4);  offset+=4;
        pf.bitCount = rUi(data, offset);  offset+=4;
        pf.RMask    = rUi(data, offset);  offset+=4;
        pf.GMask    = rUi(data, offset);  offset+=4;
        pf.BMask    = rUi(data, offset);  offset+=4;
        pf.AMask    = rUi(data, offset);  offset+=4;
        return pf;
    },
    writePixFormat: function(data, gotAlpha, offset) {
        var wUi = UTEX.U.writeUintLE, C = UTEX.DDS.C;
        var flgs = C.DDPF_FOURCC;

        wUi(data, offset,   32); offset+=4;
        wUi(data, offset, flgs); offset+=4;
        UTEX.U.writeASCII(data, offset, gotAlpha?"DXT5":"DXT1");  offset+=4;
        offset+=5*4;
    },

    readHeader10: function(data, offset) {
        var hd = {}, rUi = UTEX.U.readUintLE;

        hd.format   = rUi(data, offset);  offset+=4;
        hd.dimension= rUi(data, offset);  offset+=4;
        hd.miscFlags= rUi(data, offset);  offset+=4;
        hd.arraySize= rUi(data, offset);  offset+=4;
        hd.miscFlags2=rUi(data, offset);  offset+=4;

        return hd;
    }
};

UTEX.PVR = {
    decode: function(buff) {
        var data = new Uint8Array(buff), offset = 0;
        var head = UTEX.PVR.readHeader(data, offset);  offset+=52;
        //var ooff = offset;
        //console.log(PUtils.readByteArray(data, offset, 10))
        offset += head.mdsize;

        console.log(head);

        var w = head.width, h = head.height;
        var img = new Uint8Array(h*w*4);

        var pf = head.pf0;
        if (pf===0) {
            for (var y=0; y<h; y++) {
                for (var x=0; x<w; x++) {
                    var i = y*w+x, qi = i<<2, bi = i<<1;

                    //img[qi+0]=((data[offset+(bi>>3)]>>(bi&7))&3)*85;
                    img[qi+3]=255;
                }
            }
        } else {
            console.log("Unknown pixel format: "+pf);
        }

        return [{width: w, height: h, image: img.buffer}];
    },
    readHeader: function(data, offset) {
        var hd = {}, rUi = UTEX.U.readUintLE;
        hd.version  = rUi(data, offset);  offset+=4;
        hd.flags    = rUi(data, offset);  offset+=4;
        hd.pf0      = rUi(data, offset);  offset+=4;
        hd.pf1      = rUi(data, offset);  offset+=4;
        hd.cspace   = rUi(data, offset);  offset+=4;
        hd.ctype    = rUi(data, offset);  offset+=4;
        hd.height   = rUi(data, offset);  offset+=4;
        hd.width    = rUi(data, offset);  offset+=4;
        hd.sfnum     = rUi(data, offset);  offset+=4;
        hd.fcnum     = rUi(data, offset);  offset+=4;
        hd.mmcount  = rUi(data, offset);  offset+=4;
        hd.mdsize   = rUi(data, offset);  offset+=4;
        return hd;
    }
};

export default function(buffer) {
    return UTEX.DDS.decode(buffer)[0];
};