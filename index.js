const fs = require('fs');
const path = require('path');
const client = require('cheerio-httpcli');
const PDFDocument = require('pdfkit');
const sizeOf = require('image-size');

// TODO usage()
if (process.argv.length < 3) {
    console.error('Usage : node index.js [url]');
    process.exit(1);
}

// ダウンロードしたjpgの一時置き場
const tmpDir = '/tmp/topdftemp/';
const tmpPath = fs.mkdtempSync(tmpDir);

// ダウンロードマネージャーの設定
client.download.on('ready', stream => {
    const jpgName = path.basename(stream.url.pathname);
    stream.pipe(fs.createWriteStream(`${tmpPath}/${jpgName}`));
}).on('error', function (err) {
    console.error(err.url + 'をダウンロードできませんでした: ' + err.message);
}).on('end', function () {
    // ダウンロード待ちがなくなったらPDF作成開始
    createSlidePdf();
    console.log(`${tmpPath}/output.pdf`);
});

// 並列ダウンロード制限の設定（"3"が初期設定らしい）
//client.download.parallel = 3;

// スクレイピング開始
client.fetch(process.argv[2]).then(result => {
    result.$('div.slide_container > section.slide > img').download('data-full');
});

/**
 * スライドのPDFをつくる関数
 */
const createSlidePdf = () => {

    // ページ順でソートしてjpg一覧を取得
    const re = /-([0-9]+)-[0-9]+\.jpg$/;
    const jpglist = fs.readdirSync(tmpPath).sort((a, b) => {
        const aRe = (re.exec(a))[1];
        const bRe = (re.exec(b))[1];
        return aRe - bRe;
    });

    // jpgとpdfでサイズを合わせる
    const dimensions = sizeOf(`${tmpPath}/${jpglist[0]}`);
    const doc = new PDFDocument({
        size: [dimensions.width, dimensions.height]
    });

    // pdfを生成
    doc.pipe(fs.createWriteStream(`${tmpPath}/output.pdf`));

    jpglist.forEach((element, index) => {
        if (index !== 0) {
            doc.addPage();
        }
        doc.image(`${tmpPath}/${element}`, 0, 0);
    });

    doc.end();
}
