const Discord = require('discord.js')
const Distube = require('distube')
const config = require('./config')
const client = new Discord.Client({
    intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MEMBERS', 'GUILD_MESSAGES'],
    presence: {
        status: 'idle'
    }
})

client.on('ready', () => {
    console.log(client.user.tag + " is online!")
})

const distube = new Distube.default(client, {
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    emitNewSongOnly: true,
    ytdlOptions: {
    	highWaterMark: 1024 * 1024 * 64,
    	quality: "highestaudio",
    	format: "audioonly",
    	liveBuffer: 60000,
    	dlChunkSize: 1024 * 1024 * 4,
  	},
    leaveOnEmpty: true,
    leaveOnFinish: true,
    leaveOnStop: true,
    searchSongs: 0,
    youtubeDL: false,
    updateYouTubeDL: true,
})
distube
    .on('playSong', async (queue, song) => {
        let Data = map.get(queue.id)
        let channel = client.channels.cache.get(Data.channelID)
        let content = await channel.messages.fetch(Data.contentID)
        if (queue.songs.length == 1) {
            content.edit({
                content: `กำลังเล่น - **${song.name}** - ตอนนี้!`
            })
        } else {
            content.edit({
                content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${song.name}** - ตอนนี้!`
            })
        }

    })
    .on('addSong', async (queue, song) => {
        let Data = map.get(queue.id)
        let channel = client.channels.cache.get(Data.channelID)
        let content = await channel.messages.fetch(Data.contentID)
        content.edit({
            content: `เพิ่มเพลง - **${song.name}** - **${song.formattedDuration}**`
        })
        setTimeout(() => {
            content.edit({
                content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
            })
        }, 5000);


    })
    .on('addList', async (queue, playlist) => {
        let Data = map.get(queue.id)
        let channel = client.channels.cache.get(Data.channelID)
        let content = await channel.messages.fetch(Data.contentID)
        content.edit({
            content: `เพิ่ม Playlist - **${playlist.name} [${playlist.songs.length} songs]** - \`${playlist.formattedDuration}\``
        })
        setTimeout(() => {
            content.edit({
                content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
            })
        }, 5000);
    })
    .on('error', async (channel, e) => {
        let Data = map.get(channel.guildId)
        let channels = client.channels.cache.get(Data.channelID)
        let content = await channels.messages.fetch(Data.contentID);
        let queue = distube.getQueue(channel.guildId)
		if (!queue) {
		return content.edit({
            content: 'มีไรผิดผลาดนิดหน่อยวะ',
            components: [],
            embeds: []
        })	
		}
        if (queue.playing) {
			content.edit({
            	content: 'มีไรผิดผลาดนิดหน่อยวะ',
            	components: [],
            	embeds: []
        	})
			return setTimeout(() => {
			if (queue.songs.length == 1) {
                return content.edit({
                    content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`,
                    embeds: [],
                    components: []
                })
            } else {
                content.edit({
                    content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`,
                    embeds: [],
                    components: []
                })
            }
			}, 5000)
        }
    })
    .on('initQueue', queue => {
        queue.autoplay = config.defaultAutoplay
        queue.volume = config.defaultVolume
    })

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (
        (!oldState.streaming && newState.streaming) ||
        (oldState.streaming && !newState.streaming) ||
        (!oldState.serverDeaf && newState.serverDeaf) ||
        (oldState.serverDeaf && !newState.serverDeaf) ||
        (!oldState.serverMute && newState.serverMute) ||
        (oldState.serverMute && !newState.serverMute) ||
        (!oldState.selfDeaf && newState.selfDeaf) ||
        (oldState.selfDeaf && !newState.selfDeaf) ||
        (!oldState.selfMute && newState.selfMute) ||
        (oldState.selfMute && !newState.selfMute) ||
        (!oldState.selfVideo && newState.selfVideo) ||
        (oldState.selfVideo && !newState.selfVideo)
    )
        if (!oldState.channelId && newState.channelId) {
            if (newState.channel.type == "GUILD_STAGE_VOICE" && newState.guild.me.voice.suppress) {
                try {
                    await newState.guild.me.voice.setSuppressed(true);
                } catch (e) {
                    console.log(String(e))
                }
            }
            return null
        }
    if (oldState.channelId && !newState.channelId) {
        return
    }
    if (oldState.channelId && newState.channelId) {
        if (newState.channel.type == "GUILD_STAGE_VOICE" && newState.guild.me.voice.suppress) {
            try {
                // await newState.guild.me.voice.setRequestToSpeak(true)
                await newState.guild.me.voice.setSuppressed(true);
            } catch (e) {
                console.log(String(e))
            }
        }
        return null
    }
    if (oldState.channelId && !newState.channelId) {
        if (oldState.member.user.id === client.user.id) {
            if (distube.getQueue(oldState)) {
                distube.stop(oldState)
            }
        }
    }
})
const map = new Map()
client.on('messageCreate', async (message) => {
    const prefix = config.prefix
    // if (message.mentions.has(client.user)) {
    //     return message.channel.send(`แล้วมึงจะแท็กกุทำเหี้ยไรวะ`)
    // }
    if (
        message.author.bot ||
        !message.guild
        // !message.content.toLowerCase().startsWith(config.prefix)
    )
        return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const cmd = args.shift()
    const queue = distube.getQueue(message)
    // if (cmd == 'info') {
    //     message.channel.send(`songs: ${queue.songs.length}\nprevious songs: ${queue.previousSongs.length}`)
    // }
	let data = require('./data.json')
    let week_day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    let date = new Date()
    let _day = week_day[date.getDay().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'})]
    let contents = `[**1A** - M.4/1-2](${data[_day]['1A']['4_1_2']}) | [**1A** - M.4/3](${data[_day]['1A']['4_3']}) | [**1B** - M.4/1-3](${data[_day]['1B']}) | [**1C** - M.4/4-5](${data[_day]['1C']}) | [**2C** - M.4/4-5](${data[_day]['2C']})`
    if (cmd == 'เรียนเย็น') {
        message.channel.send({
            embeds: [new Discord.MessageEmbed().setTitle(_day.toUpperCase()).setDescription(contents).setFooter({'text': `Google Meet | ${date.toLocaleString('en-US', {timeZone: 'Asia/Bangkok', timeStyle: 'medium'})}`})]
        })
    }
	if (cmd == 'rps') {
		return message.channel.send('⚠️ อยู่ในระหว่างการปรับปรุง')
	}
    if (cmd == 'หมัด') {
        if (args.join(" ")) {
			let member_tag = args.join(" ")
			if (message.mentions.members.first()) member_tag = message.mentions.members.first().user.tag
            return  message.reply({
                content: `**${message.member.user.tag}** หมัดเข้าไปที่หน้า **${member_tag}** เป็นจำนวน **${Math.floor(Math.random() * 500)}** ที`,
                allowedMentions: {
                    repliedUser: false
                }
            })
        }
        message.reply({
            content: `**${client.user.tag}** หมัดเข้าไปที่หน้า **${message.member.user.tag}** เป็นจำนวน **${Math.floor(Math.random() * 500)}** ที`,
            allowedMentions: {
                repliedUser: false
            }
        })
    }
    if (!queue) {
        if (message.mentions.has(client.user) && message.mentions.has(message.mentions.everyone) == false) {
			let _mention = `<@!${message.mentions.members.first().user.id}>`
			let _args = message.content.slice(_mention.length).trim().split(/ +/g)
            if (_args[0].includes('https://')) {
				let x = await message.channel.send(`กำลังหาเพลง \`${_args}\``)
				map.set(message.guildId, {
                            contentID: x.id,
                            channelID: x.channelId
                })
                return distube.play(message, _args[0]).then().catch(e => { return x.edit('มีไรผิดผาลนิดหน่อยวะ') })
			}
			let messages = [`แล้วมึงจะเท็กกูอีกรอบเพื่อไรว่ะ`, 'กุถามจริง', 'มึงบ้าหรือป่าว', 'แหกตาดูก่อนมั้ย', 'กุเหนื่อยกับมึงจริงๆเลยวะ']
            let Rmessage = messages[Math.floor(Math.random() * messages.length)]
            let Data2 = map.get(message.guildId + 1)

            if (Data2 != null && Data2 != "undefined" && Data2.content == true) {
                message.delete()
                let x = await message.channel.send({
                    content: `**${message.member.user.tag}** ` + Rmessage
                })
                setTimeout(() => {
                    x.delete()
                }, 5000);

                return;
            }

            map.set(message.guildId + 1, {
                content: true
            })

            let msg = await message.channel.send({
                embeds: [{
                    description: 'ตอนนี้ไม่มีเพลงที่กำลังเล่นอยู่',
                    color: 'BLUE',
                    footer: `Latency: ${client.ws.ping}ms`
                }],
                components: [new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setCustomId('music').setLabel('เปิดเพลง').setStyle('PRIMARY'),
                    new Discord.MessageButton().setCustomId('fun').setLabel('เปิดหน้ามึงอ่ะ').setStyle('DANGER')
                )]
            })

            let filter = (m) => m.user.id === message.author.id
            let collector = msg.createMessageComponentCollector({
                filter,
                componentType: 'BUTTON'
            })
            const timeout1 = setTimeout(() => {
                collector.stop()
                map.set(message.guildId + 1, {
                    content: false
                })
                msg.edit({
                    content: 'หมดเวลาในการเลือกแล้ว **(30 วินาที)**',
                    embeds: [],
                    components: []
                })
            }, 30000);
            collector.on('collect', async (x) => {
                if (x.customId == 'music') {
                    x.deferUpdate(true)
                    if (!message.member.voice.channel) {
                        clearTimeout(timeout1)
                        collector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        return msg.edit({
                            embeds: [],
                            components: [],
                            content: 'เข้าสักห้องก่อนดิไอโง่!'
                        })
                    }
                    if (message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channelId != message.guild.me.voice.channelId) {
                        clearTimeout(timeout1)
                        collector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        return msg.edit({
                            embeds: [],
                            components: [],
                            content: `เข้ามาอยู่ห้องเดียวกับกุก่อน <#${message.guild.me.voice.channelId}>`
                        })
                    }
                    msg.edit({
                        embeds: [{
                            description: 'ตอนนี้ไม่มีเพลงที่กำลังเล่นอยู่',
                            color: 'BLUE',
                        }],
                        components: [new Discord.MessageActionRow().addComponents(
                            new Discord.MessageButton().setCustomId('play').setLabel('มีเพลงอยู่แล้ว').setStyle('PRIMARY'),
                            new Discord.MessageButton().setCustomId('search').setLabel('ให้หาเพลงที่ต้องการ').setStyle('PRIMARY')
                        )]
                    })
                }
                if (x.customId == 'fun') {
                    msg.edit({
                        embeds: [],
                        components: [],
                        content: `**${x.user.tag}** ก็มาดิไอสัส`
                    })
                    collector.stop()
                    map.set(message.guildId + 1, {
                        content: false
                    })
                    return clearTimeout(timeout1)
                }
                if (x.customId == 'search') {
                    x.deferUpdate(true)
                    clearTimeout(timeout1)
                    msg.edit({
                        embeds: [],
                        components: [],
                        content: 'ใส่ชื่อเพลง'
                    })

                    let filter = (int) => message.author.id === int.author.id
                    let contentColloector = x.channel.createMessageCollector({
                        filter,
                    })
                    const timeout2 = setTimeout(() => {
                        collector.stop()
                        contentColloector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        msg.edit({
                            content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                            embeds: [],
                            components: []
                        })
                    }, 15000);
                    contentColloector.on('collect', async (c) => {
                        try {
                            let userInput = c.content
                            if (userInput.includes(client.user.id)) return contentColloector

                            c.delete()
                            clearTimeout(timeout2)

                            msg.edit({
                                content: `กำลังหาเพลง \`${userInput}\``
                            })
                            let Result = await distube.search(userInput, {
                                limit: 15
                            })
                            // .then().catch(e => {
                            //     map.set(message.guildId + 1, {
                            //         content: false
                            //     })
                            //     contentColloector.stop()
                            //     return msg.edit('หาไม่เจอว่ะ')
                            // })
                            contentColloector.stop()

                            let searchresult = "";
                            for (let i = 0; i <= Result.length; i++) {
                                try {
                                    searchresult += await `\`${i + 1}.\` [${Result[i].name}](${Result[i].url})\n\n`;
                                } catch {
                                    searchresult += await " ";
                                }
                            }

                            let optionMenu = []
                            for (let i = 0; Result.length > i; i++) {
                                // let ResultName = Result[i].name
                                // if (Result[i].name.length > 90) ResultName = 
                                optionMenu.push({ label: `${i + 1}. ${Result[i].name.slice(0, 90)}`, description: `${Result[i].uploader.name} • ${Result[i].formattedDuration}`, value: `${Result[i].url}` })
                            }
                            let row = new Discord.MessageActionRow().addComponents(new Discord.MessageSelectMenu().setCustomId('Result').setPlaceholder(`เลือกมา 1 เพลง`).setMinValues(1).setMaxValues(1).addOptions(optionMenu))
                            let ResultMessage = msg.edit({
                                embeds: [new Discord.MessageEmbed().setColor('BLUE').setTitle('ผลลัพธ์ทั้งหมด 15 เพลง').setDescription(`${searchresult}`)],
                                components: [row],
                                content: '** **'
                            })
                            const filter = (int) => int.user.id == message.author.id
                            let resultcollector = (await ResultMessage).createMessageComponentCollector({
                                filter,
                                componentType: 'SELECT_MENU'
                            })
                            let timeout4 = setTimeout(() => {
                                collector.stop()
                                contentColloector.stop()
                                resultcollector.stop()
                                map.set(message.guildId + 1, {
                                    content: false
                                })
                                msg.edit({
                                    content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                                    embeds: [],
                                    components: []
                                })
                            }, 15000);
                            resultcollector.on('collect', (r) => {
                                if (r.customId == 'Result') {
                                    r.deferUpdate(true)
                                    var string = r.values[0]
                                    msg.edit({
                                        embeds: [],
                                        content: `กำลังหาเพลง \`${string}\``,
                                        components: []
                                    })
                                    map.set(message.guildId + 1, {
                                        content: false
                                    })
                                    map.set(message.guildId, {
                                        contentID: msg.id,
                                        channelID: msg.channelId
                                    })
                                    contentColloector.stop()
                                    collector.stop()
                                    resultcollector.stop()
                                    clearTimeout(timeout4)
                                    return distube.play(message, string)
                                }
                            })
                        } catch (err) {
                            console.log(err)
                            msg.edit('หาไม่เจอว่ะ')
                            map.set(message.guildId + 1, {
                                content: false
                            })
                        }
                    })


                }
                if (x.customId == 'play') {
                    x.deferUpdate(true)
                    clearTimeout(timeout1)
                    msg.edit({
                        embeds: [],
                        components: [],
                        content: 'ใส่ชื่อเพลงหรือลิ้งเพลง'
                    })

                    let filter = (int) => message.author.id === int.author.id
                    let contentColloector = x.channel.createMessageCollector({
                        filter,
                    })
                    const timeout3 = setTimeout(() => {
                        collector.stop()
                        contentColloector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        msg.edit({
                            content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**'
                        })

                    }, 15000);
                    contentColloector.on('collect', async (c) => {
                        let userInput = c.content
                        if (userInput.includes(client.user.id)) return contentColloector

                        c.delete()
                        clearTimeout(timeout3)
                        msg.edit({
                            content: `กำลังหาเพลง \`${userInput}\``
                        })
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        map.set(message.guildId, {
                            contentID: msg.id,
                            channelID: msg.channelId
                        })
                        contentColloector.stop()
                        collector.stop()
                        return distube.play(message, userInput).then().catch(e => { return msg.edit('มีไรผิดผาลนิดหน่อยวะ') })
                    })
                }
            })

        }
        return;
    }

    let Data = map.get(message.guildId)
    let Data2 = map.get(message.guildId + 1)
    let channel = message.guild.channels.cache.get(Data.channelID)
    let content = await channel.messages.fetch(Data.contentID)

    let messages = [`แล้วมึงจะเท็กกูอีกรอบเพื่อไรว่ะ`, 'กุถามจริง', 'มึงบ้าหรือป่าว', 'แหกตาดูก่อนมั้ย', 'กุเหนื่อยกับมึงจริงๆเลยวะ']
    let Rmessage = messages[Math.floor(Math.random() * messages.length)]
    if (message.mentions.has(client.user) && message.mentions.has(message.mentions.everyone) == false) {
        if (!message.member.voice.channel) {
            message.delete().then().catch(e => {})
            let x = await message.channel.send('เข้าสักห้องก่อนดิไอโง่!')
            return setTimeout(() => {
                x.delete()
            }, 5000);
        }
        if (message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channelId != message.guild.me.voice.channelId) {
            message.delete().then().catch(e => {})
            let x = await message.channel.send(`เข้ามาอยู่ห้องเดียวกับกุก่อน <#${message.guild.me.voice.channelId}>`)
            return setTimeout(() => {
                x.delete()
            }, 5000);
        }
			let _mention = `<@!${message.mentions.members.first().user.id}>`
			let _args = message.content.slice(_mention.length).trim().split(/ +/g)
            if (_args[0].includes('https://')) {
				message.delete()
				let x = await content.edit((`กำลังหาเพลง \`${_args}\``))
                return distube.play(message, _args[0])
			}
			
        if (Data2 != null && Data2 != "undefined" && Data2.content == true) {
            message.delete()
            let x = await message.channel.send({
                content: `**${message.member.user.tag}** ` + Rmessage
            })
            setTimeout(() => {
                x.delete()
            }, 5000);

            return;
        }

        map.set(message.guildId + 1, {
            content: true
        })
        message.delete()

        let _description = ''
        let qus = queue.songs;
        const current = qus.slice(1, 21)
        let j = 1 + 0;
        let info = current.map((track) => `**${j++}.** [\`${track.name}\`](${track.url}) | \`${track.formattedDuration} Requested by: ${track.user.tag} \``).join("\n")

        if (queue.songs.length > 21) {
            _description = `${info}\nและอีก **${queue.songs.length - 21}** เพลง\n`
        }
        else if (queue.songs.length == 1) {
            _description = 'ไม่มีเพลงต่อไปในคิว\n'
        } else {
            _description = info + '\n'
        }
        let _filed = 'กำลังเล่น'
        if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
        let msg = await content.edit({
            embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField(`${_filed}`, `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}**`, false).addField('Requested by', `**${queue.songs[0].user.tag}**`, true).addField('ห้องที่เชื่อมต่อ', `<#${queue.voiceChannel.id}>`, true).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
            components: [new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton().setCustomId('music_cmd').setLabel('คำสั่งเพลงอี่นๆ').setStyle('PRIMARY'),
            )],
            content: '** **'
        })

        let filter = (m) => m.user.id === message.author.id
        let collector = msg.createMessageComponentCollector({
            filter: filter,
            componentType: 'BUTTON',
        })
        let Timeout1 = setTimeout(() => {
            collector.stop()
            content.edit({
                content: 'หมดเวลาในการเลือกแล้ว **(30 วินาที)**',
                embeds: [],
                components: []
            })
            setTimeout(() => {
                let _filed = 'กำลังเล่น'
                if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                if (queue.songs.length == 1) {
                    content.edit({
                        content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                    })
                } else {
                    content.edit({
                        content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                    })
                }
            }, 5000);
            map.set(message.guildId + 1, {
                content: false
            })
        }, 30000);
        collector.on('collect', async (x) => {
            if (x.customId == 'music_cmd') {

                let dis_row1 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('เปิดเพลงต่อไป').setCustomId('play_next').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('หาเพลงต่อไป').setCustomId('search_next').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ยกเลิกการหยุดเล่นเพลงชั่วคราว').setCustomId('resume').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ข้ามไปเพลงต่อไป').setCustomId('next').setStyle('SECONDARY').setDisabled(),
                )
                let dis_row2 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('ย้อนกลับไปเพลงที่ผ่านมา').setCustomId('previous').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ลูปเพลง').setCustomId('loop_song').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ระดับเสียง').setCustomId('volume').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ลบเพลงในคิวทั้งหมด').setCustomId('clear_queue').setStyle('DANGER').setDisabled(),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลง').setCustomId('stop_music').setStyle('DANGER')
                )
                let row1 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('เปิดเพลงต่อไป').setCustomId('play_next').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('หาเพลงต่อไป').setCustomId('search_next').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลงชั่วคราว').setCustomId('pause').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ข้ามไปเพลงต่อไป').setCustomId('next').setStyle('SECONDARY'),
                )
                let row2 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('ย้อนกลับไปเพลงที่ผ่านมา').setCustomId('previous').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลูปเพลง').setCustomId('loop_song').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ระดับเสียง').setCustomId('volume').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลบเพลงในคิวทั้งหมด').setCustomId('clear_queue').setStyle('DANGER'),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลง').setCustomId('stop_music').setStyle('DANGER')
                )
                let row3 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('เปิดเพลงต่อไป').setCustomId('play_next').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('หาเพลงต่อไป').setCustomId('search_next').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลงชั่วคราว').setCustomId('pause').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ข้ามไปเพลงต่อไป').setCustomId('next').setStyle('SECONDARY').setDisabled(),
                )
                let row4 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('ย้อนกลับไปเพลงที่ผ่านมา').setCustomId('previous').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ลูปเพลง').setCustomId('loop_song').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ระดับเสียง').setCustomId('volume').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลบเพลงในคิวทั้งหมด').setCustomId('clear_queue').setStyle('DANGER'),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลง').setCustomId('stop_music').setStyle('DANGER')
                )
                let row5 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('เปิดเพลงต่อไป').setCustomId('play_next').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('หาเพลงต่อไป').setCustomId('search_next').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลงชั่วคราว').setCustomId('pause').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ข้ามไปเพลงต่อไป').setCustomId('next').setStyle('SECONDARY').setDisabled(),
                )
                let row6 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('ย้อนกลับไปเพลงที่ผ่านมา').setCustomId('previous').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ลูปเพลง').setCustomId('loop_song').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ระดับเสียง').setCustomId('volume').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลบเพลงในคิวทั้งหมด').setCustomId('clear_queue').setStyle('DANGER'),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลง').setCustomId('stop_music').setStyle('DANGER')
                )
                let row7 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('ย้อนกลับไปเพลงที่ผ่านมา').setCustomId('previous').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลูปเพลง').setCustomId('loop_song').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ระดับเสียง').setCustomId('volume').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลบเพลงในคิวทั้งหมด').setCustomId('clear_queue').setStyle('DANGER').setDisabled(),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลง').setCustomId('stop_music').setStyle('DANGER')
                )
                let row8 = new Discord.MessageActionRow().addComponents(
                    new Discord.MessageButton().setLabel('ย้อนกลับไปเพลงที่ผ่านมา').setCustomId('previous').setStyle('SECONDARY').setDisabled(),
                    new Discord.MessageButton().setLabel('ลูปเพลง').setCustomId('loop_song').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ระดับเสียง').setCustomId('volume').setStyle('SECONDARY'),
                    new Discord.MessageButton().setLabel('ลบเพลงในคิวทั้งหมด').setCustomId('clear_queue').setStyle('DANGER').setDisabled(),
                    new Discord.MessageButton().setLabel('หยุดเล่นเพลง').setCustomId('stop_music').setStyle('DANGER')
                )

                x.deferUpdate({
                    fetchReply: true
                }).then().catch((e) => { })
                if (queue.paused) {
                    return content.edit({
                        embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField(`${_filed}`, `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}**`, false).addField('Requested by', `**${queue.songs[0].user.tag}**`, true).addField('ห้องที่เชื่อมต่อ', `<#${queue.voiceChannel.id}>`, true).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
                        components: [dis_row1, dis_row2]
                    })
                } else {
                    if (queue.songs.length == 1 && queue.previousSongs.length >= 1) {
                        return content.edit({
                            embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField(`${_filed}`, `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}**`, false).addField('Requested by', `**${queue.songs[0].user.tag}**`, true).addField('ห้องที่เชื่อมต่อ', `<#${queue.voiceChannel.id}>`, true).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
                            components: [row3, row7]
                        })
                    }
                    if (queue.previousSongs.length < 1 && queue.songs.length > 1) {
                        return content.edit({
                            embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField(`${_filed}`, `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}**`, false).addField('Requested by', `**${queue.songs[0].user.tag}**`, true).addField('ห้องที่เชื่อมต่อ', `<#${queue.voiceChannel.id}>`, true).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
                            components: [row1, row4]
                        })
                    }
                    // if (queue.songs.length == 1 && queue.previousSongs.length >= 1) {
                    //     return content.edit({
                    //         embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField('กำลังเล่น', `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration} Requested by: ${queue.songs[0].user.tag}**`, false).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
                    //         components: [row3, row2]
                    //     })
                    // }
                    if (queue.songs.length == 1 && queue.previousSongs.length < 1) {
                        return content.edit({
                            embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField(`${_filed}`, `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}**`, false).addField('Requested by', `**${queue.songs[0].user.tag}**`, true).addField('ห้องที่เชื่อมต่อ', `<#${queue.voiceChannel.id}>`, true).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
                            components: [row5, row8]
                        })
                    }
                    content.edit({
                        embeds: [new Discord.MessageEmbed().setTitle('คิวเพลง').setColor('BLUE').setDescription(_description).addField(`${_filed}`, `**[${queue.songs[0].name}](${queue.songs[0].url})** | **${queue.formattedCurrentTime} / ${queue.songs[0].formattedDuration}**`, false).addField('Requested by', `**${queue.songs[0].user.tag}**`, true).addField('ห้องที่เชื่อมต่อ', `<#${queue.voiceChannel.id}>`, true).setFooter(`ระดับเสียง: ${queue.volume}% | ลูปเพลงปัจจุบัน: ${queue.repeatMode == 1 ? "✔" : "❌"} | ลูปคิวเพลง: ${queue.repeatMode == 2 ? "✔" : "❌"}`)],
                        components: [row1, row2]
                    })
                }
            }
            if (x.customId == 'play_next') {
                x.deferUpdate({
                    fetchReply: true
                }).then().catch((e) => { })
                content.edit({
                    content: 'ใส่ชื่อเพลงหรือลิ้งเพลง',
                    embeds: [],
                    components: []
                })
                collector.stop()
                let filter = (int) => message.author.id === int.author.id
                let contentColloector = x.channel.createMessageCollector({
                    filter,
                })
                clearTimeout(Timeout1)
                contentColloector.on('collect', async (c) => {
                    try {
                        let userInput = c.content
                        if (userInput.includes(client.user.id)) return contentColloector
                        clearTimeout(Timeout2)
                        content.edit({
                            content: `กำลังหาเพลง \`${userInput}\``,
                            embeds: [],
                            components: []
                        })
                        c.delete().then().catch((e) => { })
                        contentColloector.stop()
                        collector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        return distube.play(message, userInput)
                    } catch (err) {
                        content.edit('หาไม่เจอว่ะ')
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        console.log(err)
                        contentColloector.stop()
                        clearTimeout(Timeout2)
                        collector.stop()
                        setTimeout(() => {
                            let _filed = 'กำลังเล่น'
                            if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                            if (queue.songs.length == 1) {
                                content.edit({
                                    content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            } else {
                                content.edit({
                                    content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            }
                        }, 5000);

                    }
                })

                let Timeout2 = setTimeout(() => {
                    collector.stop()
                    contentColloector.stop()
                    content.edit({
                        content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                        embeds: [],
                        components: []
                    })
                    setTimeout(() => {
                        let _filed = 'กำลังเล่น'
                        if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                        if (queue.songs.length == 1) {
                            content.edit({
                                content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        } else {
                            content.edit({
                                content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        }
                    }, 5000);
                    map.set(message.guildId + 1, {
                        content: false
                    })
                }, 15000);

            }
            if (x.customId == 'search_next') {
                x.deferUpdate({
                    fetchReply: true
                }).then().catch((e) => { })
                content.edit({
                    content: 'ใส่ชื่อเพลง',
                    embeds: [],
                    components: []
                })
                clearTimeout(Timeout1)

                let filter = (int) => message.author.id === int.author.id
                let contentColloector = x.channel.createMessageCollector({
                    filter,
                })
                const timeout2 = setTimeout(() => {
                    collector.stop()
                    contentColloector.stop()
                    map.set(message.guildId + 1, {
                        content: false
                    })
                    content.edit({
                        content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                        embeds: [],
                        components: []
                    })
                    setTimeout(() => {
                        let _filed = 'กำลังเล่น'
                        if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                        if (queue.songs.length == 1) {
                            content.edit({
                                content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        } else {
                            content.edit({
                                content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        }
                    }, 5000);
                }, 15000);
                contentColloector.on('collect', async (c) => {
                    try {
                        let userInput = c.content
                        if (userInput.includes(client.user.id)) return contentColloector

                        c.delete()
                        clearTimeout(timeout2)

                        content.edit({
                            content: `กำลังหาเพลง \`${userInput}\``
                        })
                        let Result = await distube.search(userInput, {
                            limit: 15
                        }).then().catch(e => {
                            map.set(message.guildId + 1, {
                                content: false
                            })
                            contentColloector.stop()
                            content.edit('หาไม่เจอว่ะ')
                            setTimeout(() => {
                                let _filed = 'กำลังเล่น'
                                if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                                if (queue.songs.length == 1) {
                                    content.edit({
                                        content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                    })
                                } else {
                                    content.edit({
                                        content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                    })
                                }
                            }, 5000);
                        })
                        contentColloector.stop()

                        let searchresult = "";
                        for (let i = 0; i <= Result.length; i++) {
                            try {
                                searchresult += await `\`${i + 1}.\` [${Result[i].name}](${Result[i].url})\n\n`;
                            } catch {
                                searchresult += await " ";
                            }
                        }

                        let optionMenu = []
                        for (let i = 0; Result.length > i; i++) {
                            optionMenu.push({ label: `${i + 1}. ${Result[i].name.slice(0, 90)}`, description: `${Result[i].uploader.name} • ${Result[i].formattedDuration}`, value: `${Result[i].url}` })
                        }
                        let row = new Discord.MessageActionRow().addComponents(new Discord.MessageSelectMenu().setCustomId('Result').setPlaceholder(`เลือกมา 1 เพลง`).setMinValues(1).setMaxValues(1).addOptions(optionMenu))
                        let ResultMessage = content.edit({
                            embeds: [new Discord.MessageEmbed().setColor('BLUE').setTitle('ผลลัพธ์ทั้งหมด 15 เพลง').setDescription(`${searchresult}`)],
                            components: [row],
                            content: '** **'
                        })
                        const filter = (int) => int.user.id == message.author.id
                        let resultcollector = (await ResultMessage).createMessageComponentCollector({
                            filter,
                            componentType: 'SELECT_MENU'
                        })
                        let timeout4 = setTimeout(() => {
                            collector.stop()
                            contentColloector.stop()
                            resultcollector.stop()
                            map.set(message.guildId + 1, {
                                content: false
                            })
                            content.edit({
                                content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                                embeds: [],
                                components: []
                            })
                            setTimeout(() => {
                                let _filed = 'กำลังเล่น'
                                if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                                if (queue.songs.length == 1) {
                                    content.edit({
                                        content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                    })
                                } else {
                                    content.edit({
                                        content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                    })
                                }
                            }, 5000);
                        }, 15000);
                        resultcollector.on('collect', (r) => {
                            if (r.customId == 'Result') {
                                r.deferUpdate(true)
                                var string = r.values[0]
                                content.edit({
                                    embeds: [],
                                    content: `กำลังหาเพลง \`${string}\``,
                                    components: []
                                })
                                map.set(message.guildId + 1, {
                                    content: false
                                })
                                map.set(message.guildId, {
                                    contentID: msg.id,
                                    channelID: msg.channelId
                                })
                                contentColloector.stop()
                                collector.stop()
                                resultcollector.stop()
                                clearTimeout(timeout4)
                                return distube.play(message, string)
                            }
                        })
                    } catch (err) {
                        content.edit('หาไม่เจอว่ะ')
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        console.log(err)
                        collector.stop()
                        contentColloector.stop()
                        setTimeout(() => {
                            let _filed = 'กำลังเล่น'
                            if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                            if (queue.songs.length == 1) {
                                content.edit({
                                    content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            } else {
                                content.edit({
                                    content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            }
                        }, 5000);
                    }
                })

            }
            if (x.customId == 'pause') {
                x.deferUpdate(true)
                content.edit({
                    content: `หยุดเล่นเพลงชั่วคราว - **${queue.songs[0].name}** - ตอนนี้!`,
                    embeds: [],
                    components: []
                })
                map.set(message.guildId + 1, {
                    content: false
                })
                clearTimeout(Timeout1)
                collector.stop()
                return distube.pause(message)
            }
            if (x.customId == 'resume') {
                x.deferUpdate(true)
                if (queue.songs.length == 1) {
                    content.edit({
                        content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`,
                        embeds: [],
                        components: []
                    })
                } else {
                    content.edit({
                        content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`,
                        embeds: [],
                        components: []
                    })
                }
                map.set(message.guildId + 1, {
                    content: false
                })
                clearTimeout(Timeout1)
                collector.stop()
                return distube.resume(message)
            }
            if (x.customId == 'next') {
                x.deferUpdate(true)
                content.edit({
                    content: `ข้ามไปเพลงต่อไป`,
                    embeds: [],
                    components: []
                })
                // setTimeout(() => {
                //     if (queue.songs.length == 1) {
                //         content.edit({
                //             content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                //         })
                //     } else {
                //         content.edit({
                //             content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                //         })
                //     }
                // }, 5000);
                map.set(message.guildId + 1, {
                    content: false
                })
                clearTimeout(Timeout1)
                collector.stop()
                return distube.skip(message)
            }
            if (x.customId == 'previous') {
                x.deferUpdate(true)
                content.edit({
                    content: `ย้อนกลับไปเพลงที่ผ่านมา`,
                    embeds: [],
                    components: []
                })
                // setTimeout(() => {
                //     if (queue.songs.length == 1) {
                //         content.edit({
                //             content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                //         })
                //     } else {
                //         content.edit({
                //             content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                //         })
                //     }
                // }, 5000);
                map.set(message.guildId + 1, {
                    content: false
                })
                clearTimeout(Timeout1)
                collector.stop()
                return distube.previous(message)
            }
            if (x.customId == 'loop_song') {
                x.deferUpdate(true)
                content.edit({
                    content: 'จะเพลงจะคิวก็เลือกมาได้หมดอ่ะ',
                    embeds: [],
                    components: [new Discord.MessageActionRow().addComponents(
                        new Discord.MessageButton().setCustomId('ls').setLabel('ลูปเพลงปัจจุบัน').setStyle('PRIMARY'),
                        new Discord.MessageButton().setCustomId('lq').setLabel('ลูปทุกเพลงในคิว').setStyle('PRIMARY')
                    )]
                })
                map.set(message.guildId + 1, {
                    content: false
                })
                clearTimeout(Timeout1)

                let filter = (l) => l.user.id === message.author.id
                let Bcollector = msg.createMessageComponentCollector({
                    filter: filter,
                    componentType: 'BUTTON',
                })
                let Timeout5 = setTimeout(() => {
                    collector.stop()
                    content.edit({
                        content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                        embeds: [],
                        components: []
                    })
                    setTimeout(() => {
                        if (queue.songs.length == 1) {
                            return content.edit({
                                content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        } else {
                            content.edit({
                                content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        }
                    }, 5000);
                    map.set(message.guildId + 1, {
                        content: false
                    })
                }, 15000);
                Bcollector.on('collect', async (b) => {
                    if (b.customId == 'ls') {
                        b.deferUpdate(true)

                        clearTimeout(Timeout5)
                        collector.stop()
                        Bcollector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        distube.setRepeatMode(message, parseInt(1))
                        content.edit({
                            content: `${queue.repeatMode == 1 ? "ลูปเพลง" : "ยกเลิกการลูปเพลง"}ปัจจุบัน`,
                            embeds: [],
                            components: []
                        })
                        return setTimeout(() => {
                            if (queue.songs.length == 1) {
                                content.edit({
                                    content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            } else {
                                content.edit({
                                    content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            }
                        }, 5000);
                    }
                    if (b.customId == 'lq') {
                        b.deferUpdate(true)
                        clearTimeout(Timeout5)
                        collector.stop()
                        Bcollector.stop()
                        map.set(message.guildId + 1, {
                            content: false
                        })
                        distube.setRepeatMode(message, parseInt(2))
                        content.edit({
                            content: `${queue.repeatMode == 2 ? "ลูปทุกเพลง" : "ยกเลิกการลูปทุกเพลง"}ในคิว`,
                            embeds: [],
                            components: []
                        })
                        return setTimeout(() => {
                            if (queue.songs.length == 1) {
                                content.edit({
                                    content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            } else {
                                content.edit({
                                    content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                                })
                            }
                        }, 5000);
                    }
                })
            }
            if (x.customId == 'volume') {
                x.deferUpdate(true)
                content.edit({
                    content: 'ใส่จำนวนที่ต้องการ',
                    embeds: [],
                    components: []
                })
                let filter = (int) => message.author.id === int.author.id
                let contentColloector = x.channel.createMessageCollector({
                    filter,
                })
                collector.stop()
                clearTimeout(Timeout1)
                contentColloector.on('collect', async (c) => {
                    let userInput = c.content
                    c.delete()
                    if (isNaN(userInput)) {
                        let x = await message.channel.send('ใส่ได่แค่ตัวเลขไอโง่')
                        setTimeout(() => {
                            x.delete()
                        }, 5000);
                        return contentColloector
                    }
                    if (userInput > 200) {
                        let x = await message.channel.send('ปรับได้ไม่เกิน 200 ไอโง่')
                        setTimeout(() => {
                            x.delete()
                        }, 5000);
                        return contentColloector
                    }
                    clearTimeout(Timeout2)
                    contentColloector.stop()
                    map.set(message.guildId + 1, {
                        content: false
                    })
                    let vol = ''
                    if (queue.volume < Number(userInput)) {
                        vol = 'เพิ่มเสียงไปที่ '
                    }
                    if (queue.volume > Number(userInput)) {
                        vol = 'ลดเสียงไปที่ '
                    }
                    content.edit({
                        content: `${vol} **${userInput}%**`
                    })
                    setTimeout(() => {
                        if (queue.songs.length == 1) {
                            content.edit({
                                content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        } else {
                            content.edit({
                                content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        }
                    }, 5000);
                    return distube.setVolume(message, parseInt(userInput))
                })
                let Timeout2 = setTimeout(() => {
                    collector.stop()
                    contentColloector.stop()
                    content.edit({
                        content: 'หมดเวลาในการเลือกแล้ว **(15 วินาที)**',
                        embeds: [],
                        components: []
                    })
                    setTimeout(() => {
                        let _filed = 'กำลังเล่น'
                        if (queue.paused) _filed = 'กำลังหยุดเล่นเพลงชั่วคราว'
                        if (queue.songs.length == 1) {
                            content.edit({
                                content: `${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        } else {
                            content.edit({
                                content: `__[${queue.songs.length - 1}] เพลงในคิว__\n${_filed} - **${queue.songs[0].name}** - ตอนนี้!`
                            })
                        }
                    }, 5000);
                    map.set(message.guildId + 1, {
                        content: false
                    })
                }, 15000);
            }
            if (x.customId == 'stop_music') {
                x.deferUpdate(true)
                content.edit({
                    content: `คามุยย!`,
                    embeds: [],
                    components: []
                })
                map.set(message.guildId + 1, {
                    content: false
                })
                clearTimeout(Timeout1)
                collector.stop()
                return distube.stop(message)
            }
            if (x.customId == 'clear_queue') {
                x.deferUpdate(true)
                content.edit({
                    content: `ลบเพลงในคิวทั้งหมด **${queue.songs.length - 1}** เพลง`,
                    embeds: [],
                    components: []
                })
                clearTimeout(Timeout1)
                collector.stop()
                queue.songs = [queue.songs[0]]
                map.set(message.guildId + 1, {
                    content: false
                })
                return setTimeout(() => {
                    if (queue.songs.length == 1) {
                        return content.edit({
                            content: `กำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                        })
                    } else {
                        content.edit({
                            content: `__[${queue.songs.length - 1}] เพลงในคิว__\nกำลังเล่น - **${queue.songs[0].name}** - ตอนนี้!`
                        })
                    }
                }, 5000);

            }
        })

    }
    // if (cmd == 'help') return message.channel.send('ไม่บอกไอสัส')
    // if (cmd == 'play' || cmd == 'p') {
    //     let query = args[0]
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!query) return message.channel.send(`**ใส่ลิ้งค์หรือชื่อเพลงดิ!**`)

    //     distube.play(message, query).catch(err => console.log(err.err))
    //     return message.channel.sendTyping()
    // }

    // if (cmd == 'skip') {
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!queue) return message.channel.send('**ตอนนี้กุไม่ได้เล่นเพลงไรเลย**')
    //     if (queue.songs.length == 1) return message.channel.send('**ไม่มีเพลงให้ข้ามไอโง่!**')
    //     distube.skip(message)
    //     return message.reply({
    //         content: `ข้ามไปเพลงต่อไป`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })

    // }

    // if (cmd == 'previous' || cmd == 'pre') {
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!queue) return message.channel.send('**ตอนนี้กุไม่ได้เล่นเพลงไรเลย**')

    //     if (queue.previousSongs.length < 1) return message.channel.send('**ไม่มีเพลงให้ย้อนไอโง่**')

    //     distube.previous(message)
    //     return message.reply({
    //         content: `ย้อนกลับไปเพลงที่แล้ว`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })

    // }

    // if (cmd == 'volume' || cmd == 'vol') {
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!queue) return message.channel.send('**ตอนนี้กุไม่ได้เล่นเพลงไรเลย**')

    //     if (!args[0]) return message.reply({
    //         content: `**${queue.volume}%**`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })

    //     distube.setVolume(message, parseInt(args[0]))

    //     return message.reply({
    //         content: `**${queue.volume}%**`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })
    // }

    // if (cmd == 'pause') {
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!queue) return message.channel.send('**ตอนนี้กุไม่ได้เล่นเพลงไรเลย**')

    //     if (queue.paused) return message.channel.send('**Pause เหี้ยไรมึง pause อยู่ไอสัส**')
    //     distube.pause(message)
    //     return message.reply({
    //         content: `หยุดเล่นเพลงชั่วคราว`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })
    // }
    // if (cmd == 'resume') {
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!queue) return message.channel.send('**ตอนนี้กุไม่ได้เล่นเพลงไรเลย**')

    //     if (queue.playing) return message.channel.send('**เพลงไม่ได้หยุดไอสัส!**')
    //     distube.resume(message)
    //     return message.reply({
    //         content: `เล่นเพลงต่อ`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })
    // }

    // if (cmd == 'search') {
    //     try {
    //         const query = args.join(" ")
    //         if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //         if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //         if (!query) return message.channel.send(`**ใส่ชื่อเพลงที่จะหาดิ!**`)

    //         message.channel.sendTyping()

    //         let Result = await distube.search(query, {
    //             limit: 15
    //         })

    //         let optionMenu = []
    //         for (let i = 0; Result.length > i; i++) {
    //             optionMenu.push({ label: `${Result[i].name}`, description: `${Result[i].uploader.name} • ${Result[i].formattedDuration}`, value: `${Result[i].url}` })
    //         }
    //         let row = new Discord.MessageActionRow().addComponents(new Discord.MessageSelectMenu().setCustomId('searchResult').setPlaceholder(`เลือกมา 1 เพลง`).setMinValues(1).setMaxValues(1).addOptions(optionMenu))

    //         let msg = await message.channel.send({
    //             embeds: [new Discord.MessageEmbed().setColor('GREEN').setDescription(`🔎 **RESULT FOR** \`${query}\``)],
    //             components: [row]
    //         })

    //         let filter = (int) => int.user.id === message.author.id
    //         let collector = msg.createMessageComponentCollector({
    //             filter,
    //             componentType: 'SELECT_MENU'
    //         })
    //         let Timeout = setTimeout(() => {
    //             msg.edit({
    //                 embeds: [],
    //                 content: 'หมดเวลาเลือกแล้วไอเหี้ย',
    //                 components: []
    //             })
    //             collector.stop()
    //         }, 15000);
    //         collector.on('collect', (x) => {
    //             x.deferUpdate()
    //             var string = x.values
    //             distube.play(message, string[0]).catch()
    //             x.channel.sendTyping()
    //             msg.delete()
    //             clearTimeout(Timeout)
    //             return collector.stop()
    //         })

    //     } catch (e) {
    //         message.channel.send('หาไม่เจอวะโทษที')
    //     }
    // }

    // if (cmd == 'stop') {
    //     if (!message.member.voice.channel) return message.channel.send("**เข้าสักห้องก่อนดิไอโง่!**")
    //     if (message.member.voice.channe && message.member.voice.channelId != message.guild.me.voice.channelId) return message.channel.send(`**เข้ามาอยู่ห้องเดียวกับกุก่อน** <#${queue.voiceChannel.id}>`)
    //     if (!queue) return message.channel.send('**ตอนนี้กุไม่ได้เล่นเพลงไรเลย**')

    //     distube.stop(message)

    //     return message.reply({
    //         content: `กุไปละ`,
    //         allowedMentions: {
    //             repliedUser: false
    //         }
    //     })
    // }
})

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('KINNOM'));
app.listen(port, () => console.log(`app listening at http://localhost:${port}`));

client.login(config.token)
