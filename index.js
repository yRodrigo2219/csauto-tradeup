const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios').default;

function updateCases() {
    return new Promise((resolve, reject) => {
        const cases = {

        };

        axios.get('https://csgostash.com/containers/skin-cases').then(res => {
            const $ = cheerio.load(res.data);

            // creates an object with all the cases names and links
            $('.well.result-box.nomargin') // get all cases
                .not($('.abbu-body-resultbox').parent()) // removes ads
                .each((i, el) => {
                    cases[$(el).find('h4').text()] = $(el).find('a').attr('href');
                });

            // writes in disk as a json
            fs.writeFile("./data/cases.json", JSON.stringify(cases), (err) => {
                if (err) {
                    reject(null);
                    return console.warn('\x1b[31m%s\x1b[0m', "Erro ao atualizar a lista de caixas!\n", err);
                }

                console.warn("\x1b[32m%s\x1b[0m", "Caixas atualizadas com sucesso!");
                resolve(cases);

            });

        }).catch(res => {
            reject(null);
            console.warn('\x1b[31m%s\x1b[0m', "Erro ao pegar informacao das caixas!\n", res);

        });
    });

}

function updateCaseSkins(caseName, caseLink) {
    return new Promise((resolve, reject) => {
        const skins = {

        };

        axios.get(caseLink).then(res => {
            const $ = cheerio.load(res.data);

            $('.well.result-box.nomargin') // gets all items
                .not($('.quality.color-rare-item').parent()) // remove knives
                .not($('.abbu-body-resultbox').parent()) // remove ads
                .each((i, el) => {
                    if (!skins[$(el).find('.quality').attr('class').slice(14, )])
                        skins[$(el).find('.quality').attr('class').slice(14, )] = {}
                    skins[$(el).find('.quality').attr('class').slice(14, )][$(el).find('h3').text()] = $(el).children('a').not('.nounderline').attr('href');
                });

            // writes json in disk
            fs.writeFile(`./data/${caseName}.json`, JSON.stringify(skins), err => {
                if (err) {
                    reject(null);
                    return console.warn('\x1b[31m%s\x1b[0m', "Erro ao atualizar a lista de caixas!\n", err);
                }

                console.warn("\x1b[32m%s\x1b[0m", `${caseName} atualizada!`);
                resolve(skins);

            });

        }).catch(res => {
            reject(null);
            console.warn('\x1b[31m%s\x1b[0m', "Erro ao pegar informacao da caixa!\n", res);

        });

    });

}

function delay(ms){
    return new Promise(resolve=>{
        setTimeout(_=>resolve(), ms);
    });
}

async function queryPrice(itemName) {
    let link = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=7&market_hash_name=${itemName}`;

    return await axios.get(link).then(async res => {
        if (!res.data.success)
            return null;

        const price = Number.parseFloat(res.data.median_price.slice(3, ).replace(',', '.'));
        console.warn(`${itemName}: R$${price}`);
        return await delay(3000).then(_=>{
            return price;
        });

    }).catch(async res => {
        console.warn('\x1b[31m%s\x1b[0m', `Erro preco ${itemName}!`);
        return await delay(10000).then(_=>{
            return queryPrice(itemName);
        });

    });
}

function updateSkin(skinName, skinLink) {
    return new Promise((resolve, reject) => {
        const skin = {

        };

        const floats = {
            "Factory New": 0.07,
            "Minimal Wear": 0.15,
            "Field-Tested": 0.38,
            "Well-Worn": 0.45,
            "Battle-Scarred": 1
        }
        let [fn, mw, ft, ww, bs] = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];

        axios.get(skinLink).then(async res => {
            console.warn('\x1b[36m%s\x1b[0m', `${skinName}:`);
            const $ = cheerio.load(res.data);

            let wears = $('.marker-value.cursor-default').toArray();
            skin.minWear = Number.parseFloat($(wears[0]).text());
            skin.maxWear = Number.parseFloat($(wears[1]).text());

            if (skin.minWear < floats[fn])
                skin[fn] = await queryPrice(`${skinName} (${fn})`);


            if (skin.minWear < floats[mw] && skin.maxWear > floats[fn])
                skin[mw] = await queryPrice(`${skinName} (${mw})`);


            if (skin.minWear < floats[ft] && skin.maxWear > floats[mw])
                skin[ft] = await queryPrice(`${skinName} (${ft})`);


            if (skin.minWear < floats[ww] && skin.maxWear > floats[ft])
                skin[ww] = await queryPrice(`${skinName} (${ww})`);


            if (skin.minWear < floats[bs] && skin.maxWear > floats[ww])
                skin[bs] = await queryPrice(`${skinName} (${bs})`);


            // writes in disk
            fs.writeFile(`./data/skins/${skinName}.json`, JSON.stringify(skin), err => {
                if (err) {
                    reject(null);
                    return console.warn('\x1b[31m%s\x1b[0m', "Erro ao atualizar a skin!\n", err);
                }

                console.warn("\x1b[32m%s\x1b[0m", `${skinName} atualizada!`);
                resolve(true);
            });

        }).catch(res => {
            reject(null);
            console.warn('\x1b[31m%s\x1b[0m', "Erro ao pegar informacao da caixa!\n");

        });

    });
}

function routineUpdateWholeCase(caseName, caseLink) {
    return new Promise((resolve, reject) => {
        updateCaseSkins(caseName, caseLink).then(async res => {
            // updates skins from all qualities
            for(const qual of Object.keys(res))
                for(const skinName of Object.keys(res[qual]))
                    await updateSkin(skinName, res[qual][skinName]);

            resolve(null);

        }).catch(err => {
            reject(null);
            console.warn('\x1b[31m%s\x1b[0m', "Erro na requisicao da caixa!\n", err);

        });
    });
}

function routineUpdateWholeDB() {
    return new Promise((resolve, reject) => {
        updateCases().then(async res => {
            for(const caseName of Object.keys(res))  
                await routineUpdateWholeCase(caseName, res[caseName])

            resolve();

        }).catch(err => {
            reject(null);
            console.warn('\x1b[31m%s\x1b[0m', "Erro na requisicao das caixas!\n", err);

        });
    });
}

routineUpdateWholeDB().then(res => console.log("Acabou!"));