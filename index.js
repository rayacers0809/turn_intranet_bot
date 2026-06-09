// ╔══════════════════════════════════════════════════════╗
// ║   Turn City 인트라넷 봇 - 관리자 코드 발급 시스템       ║
// ║   discord.js v14 + API 서버 연동                      ║
// ╚══════════════════════════════════════════════════════╝

const { Client, GatewayIntentBits, EmbedBuilder, Colors } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// ─── API 서버 연동 ─────────────────────────────────────
const API = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3000',
  headers: { 'x-bot-secret': process.env.BOT_SECRET },
});

// ─── Discord 클라이언트 ────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// ─── 설정 ──────────────────────────────────────────────
const CONFIG = {
  ADMIN_ROLE_ID:  process.env.ADMIN_ROLE_ID,
  GUILD_ID:       process.env.GUILD_ID,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,
  CODE_EXPIRE_MS: 24 * 60 * 60 * 1000,
};

// ─── 유틸 ──────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function isAdmin(member) {
  return member.permissions.has('Administrator') || member.roles.cache.has(CONFIG.ADMIN_ROLE_ID);
}

function makeEmbed({ color, title, desc = '', fields = [], footer }) {
  const e = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
  if (desc) e.setDescription(desc);
  if (fields.length) e.addFields(fields);
  if (footer) e.setFooter({ text: footer });
  return e;
}

async function sendLog(guild, { color, title, fields }) {
  if (!CONFIG.LOG_CHANNEL_ID) return;
  try {
    const ch = await guild.channels.fetch(CONFIG.LOG_CHANNEL_ID);
    await ch.send({ embeds: [makeEmbed({ color, title, fields })] });
  } catch {}
}

// ══════════════════════════════════════════════════════
// READY
// ══════════════════════════════════════════════════════
client.once('ready', () => {
  console.log(`[Turn City Bot] 로그인: ${client.user.tag}`);
  client.user.setActivity('Turn City 인트라넷 관리 중', { type: 3 });
});

// ══════════════════════════════════════════════════════
// INTERACTION
// ══════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  // /인트라넷코드
  if (commandName === '인트라넷코드') {
    const sub = interaction.options.getSubcommand();

    // ── 발급 ──────────────────────────────────────────
    if (sub === '발급') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          embeds: [makeEmbed({ color: Colors.Red, title: '❌ 권한 없음', desc: '**관리자**만 사용할 수 있습니다.' })],
          ephemeral: true,
        });
      }

      const targetUser  = interaction.options.getUser('대상');
      const factionName = interaction.options.getString('팩션명');
      await interaction.deferReply({ ephemeral: true });

      // 중복 코드 체크
      const { data: listData } = await API.get('/api/bot/active-codes').catch(() => ({ data: { codes: [] } }));
      const existing = (listData.codes || []).find(c => c.targetId === targetUser.id);

      if (existing) {
        const expSec = Math.floor(existing.expiresAt / 1000);
        return interaction.editReply({
          embeds: [makeEmbed({
            color: Colors.Yellow,
            title: '⚠️ 기존 코드 존재',
            desc: `<@${targetUser.id}>에게 이미 미사용 코드가 있습니다.`,
            fields: [
              { name: '코드', value: `\`${existing.code}\``, inline: true },
              { name: '만료', value: `<t:${expSec}:R>`,      inline: true },
              { name: '안내', value: '`/인트라넷코드 취소` 로 먼저 삭제하세요.' },
            ],
          })],
        });
      }

      // 코드 생성 & 저장
      const code = generateCode();
      const { data: saveData } = await API.post('/api/bot/issue-code', {
        code, targetId: targetUser.id, factionName: factionName || '미정', issuedBy: interaction.user.id,
      }).catch(e => ({ data: { ok: false, reason: e.message } }));

      if (!saveData.ok) {
        return interaction.editReply({
          embeds: [makeEmbed({ color: Colors.Red, title: '❌ 서버 오류', desc: `저장 실패: ${saveData.reason}` })],
        });
      }

      // DM 발송
      let dmSent = true;
      try {
        await targetUser.send({
          embeds: [makeEmbed({
            color: 0xE8B84B,
            title: '🏙️ Turn City 인트라넷 생성 코드',
            desc: '관리자가 팩션 인트라넷 생성 코드를 발급했습니다.\nTurn City 인트라넷 사이트에서 입력하세요.',
            fields: [
              { name: '🔑 인증 코드', value: `## \`${code}\``, inline: false },
              { name: '📋 팩션명',   value: factionName || '미정', inline: true },
              { name: '⏰ 만료',     value: `<t:${Math.floor((Date.now() + CONFIG.CODE_EXPIRE_MS) / 1000)}:R>`, inline: true },
              { name: '⚠️ 주의',    value: '**1회** 사용 가능, **24시간** 후 만료. 절대 타인에게 공유하지 마세요.' },
            ],
            footer: 'Turn City 인트라넷 시스템',
          })],
        });
      } catch { dmSent = false; }

      await interaction.editReply({
        embeds: [makeEmbed({
          color: Colors.Green,
          title: '✅ 코드 발급 완료',
          desc: dmSent ? `<@${targetUser.id}>에게 DM으로 코드를 발송했습니다.` : `⚠️ <@${targetUser.id}>의 DM이 막혀 전송 실패. 코드를 직접 전달하세요.`,
          fields: [
            { name: '코드',   value: `\`${code}\``, inline: true },
            { name: '팩션명', value: factionName || '미정', inline: true },
            { name: 'DM',    value: dmSent ? '✅ 성공' : '❌ 실패', inline: true },
            { name: '만료',  value: `<t:${Math.floor((Date.now() + CONFIG.CODE_EXPIRE_MS) / 1000)}:R>`, inline: true },
          ],
          footer: `발급자: ${interaction.user.username}`,
        })],
      });

      await sendLog(interaction.guild, {
        color: 0xE8B84B, title: '📋 인트라넷 코드 발급',
        fields: [
          { name: '대상',   value: `<@${targetUser.id}>`,       inline: true },
          { name: '발급자', value: `<@${interaction.user.id}>`, inline: true },
          { name: '팩션명', value: factionName || '미정',        inline: true },
          { name: 'DM',    value: dmSent ? '✅' : '❌',          inline: true },
        ],
      });
    }

    // ── 취소 ──────────────────────────────────────────
    else if (sub === '취소') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          embeds: [makeEmbed({ color: Colors.Red, title: '❌ 권한 없음', desc: '관리자만 사용 가능합니다.' })],
          ephemeral: true,
        });
      }
      const targetUser = interaction.options.getUser('대상');
      await interaction.deferReply({ ephemeral: true });

      const { data } = await API.delete(`/api/bot/cancel-code/${targetUser.id}`).catch(() => ({ data: { ok: false, deleted: 0 } }));

      await interaction.editReply({
        embeds: [makeEmbed({
          color: data.deleted > 0 ? Colors.Green : Colors.Yellow,
          title: data.deleted > 0 ? '🗑️ 코드 취소 완료' : '⚠️ 코드 없음',
          desc: data.deleted > 0
            ? `<@${targetUser.id}>의 코드 **${data.deleted}개** 삭제 완료.`
            : `<@${targetUser.id}>에게 활성화된 코드가 없습니다.`,
        })],
      });

      if (data.deleted > 0) {
        await sendLog(interaction.guild, {
          color: Colors.Orange, title: '🗑️ 인트라넷 코드 취소',
          fields: [
            { name: '대상',   value: `<@${targetUser.id}>`,       inline: true },
            { name: '취소자', value: `<@${interaction.user.id}>`, inline: true },
            { name: '삭제',   value: `${data.deleted}개`,          inline: true },
          ],
        });
      }
    }

    // ── 목록 ──────────────────────────────────────────
    else if (sub === '목록') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          embeds: [makeEmbed({ color: Colors.Red, title: '❌ 권한 없음', desc: '관리자만 사용 가능합니다.' })],
          ephemeral: true,
        });
      }
      await interaction.deferReply({ ephemeral: true });

      const { data } = await API.get('/api/bot/active-codes').catch(() => ({ data: { codes: [] } }));
      const codes = (data.codes || []).slice(0, 10);

      await interaction.editReply({
        embeds: [makeEmbed({
          color: Colors.Blue,
          title: `📋 활성 코드 목록 (${codes.length}개)`,
          desc: codes.length
            ? codes.map(c => `\`${c.code}\` — <@${c.targetId}> | ${c.factionName} | 만료 <t:${Math.floor(c.expiresAt / 1000)}:R>`).join('\n')
            : '활성화된 코드가 없습니다.',
          footer: '최대 10개 표시',
        })],
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
