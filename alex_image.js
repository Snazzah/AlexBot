"use strict";

var indico = require('indico.io');
var fs = require('fs');
var Discord = require('discord.js')
var request = require('request');
var JsonDB = require('node-json-db');

var config = require('./config.json');

indico.apiKey =  config.indicoKey;

var bot = new Discord.Client({
    autoReconnect: true,
    maxCachedMessages: 1,
    forceFetchUsers: false
});

bot.on("ready", () => {
    console.log(`Ready to begin! Serving in ${bot.channels.length} channels`);
    bot.setPlayingGame("Image Voodoo ("+bot.servers.length+" servers)");
});

function checkImage(url, msg){
    var stream = request(url).pipe(fs.createWriteStream('temp.jpg'));
    stream.on('finish', function() {
        fs.readFile("temp.jpg", 'binary', function(err, original_data){
        fs.writeFile('image_orig.jpg', original_data, 'binary', function(err) {});
        var base64Image = new Buffer(original_data, 'binary').toString('base64');
        indico.contentFiltering(base64Image)
          .then(res => {response(res, msg)})
          .catch(console.log);
        });
    });
}

function findUrls( text ) {
    var source = (text || '').toString();
    var urlArray = [];
    var url;
    var matchArray;
    var regexToken = /(((ftp|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;    
    while( (matchArray = regexToken.exec( source )) !== null ) {
        var token = matchArray[0];
        urlArray.push( token );
    }
    return urlArray;
}

bot.on('message', msg => {
    if (msg.content.startsWith("<@"+bot.user.id+"> invite") || msg.content.startsWith("<@!"+bot.user.id+"> invite")) {
        bot.sendMessage(msg, "Invite me: https://u.1536.cf/alexinvite");
    }
    if(msg.attachments[0]) {
        if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages") && !msg.channel.name.toLowerCase().includes("nsfw")) {
            checkImage(msg.attachments[0].url, msg);
        }
    }
    var urls = findUrls(msg.content);
    if (urls.length > 0) {
        console.log(urls);
        if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages") && !msg.channel.name.toLowerCase().includes("nsfw")) {
            for (let url of urls) {
                console.log("checking", url);
                checkImage(url, msg);
            }
        }
    }
});

function dealWithUser(msg) {
    var db = new JsonDB("users", true, true);
    var details = {};
    try {
        details = db.getData('/user/'+msg.author.id);
    } catch(err) {
        details = {"offences": 0};
        db.push('/user/'+msg.author.id, details);
    }
    details['offences'] = details['offences']+1;
    db.push('/user/'+msg.author.id, details);
    bot.sendMessage(msg, "PORN DETECTED!!! offence #"+details['offences'] + " for " + msg.author.mention()); 
    if (details['offences'] == 1) {
        bot.sendMessage(msg, msg.author.mention() + " please do not post NSFW content kthxbye");
    }
    if (details['offences'] == 2) {
        bot.sendMessage(msg, msg.author.mention() + " if you post one more NSFW image i will kick you!");
    }
    if (details['offences'] > 2) {
        bot.kickMember(msg.author, msg.server);
    }
}

function response(res, msg) {
    console.log(res);
    if (res > 0.44) {
        bot.deleteMessage(msg);
        dealWithUser(msg);
    }
}


bot.on("serverCreated", server => {
    bot.setPlayingGame("Image Voodoo ("+bot.servers.length+" servers)");
    updateAbal();
});

bot.on("serverDeleted", server => {
    bot.setPlayingGame("Image Voodoo ("+bot.servers.length+" servers)");
    updateAbal();
});

var updateAbal = function(){
    console.log("updating carbon");
    //console.log(bot.servers.length);
    var options = {
        method: 'POST',
        url: 'https://bots.discord.pw/api/bots/'+bot.user.id+'/stats',
         headers: {
            'Content-Type': 'application/json',
            'Authorization': config.abal
           },
        body: JSON.stringify({'server_count': bot.servers.length})
    };

    request_two(options, function(error, response, body) {
        if (error) console.log(error);
        //console.log(response);
        console.log(body);
    });
}


bot.loginWithToken(config.token);
