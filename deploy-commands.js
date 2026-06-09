// deploy-commands.js
// node deploy-commands.js 로 실행해서 슬래시 커맨드 등록

const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  // ── /인트라넷코드 ──────────────────────────────────
  new SlashCommandBuilder()
    .setName('인트라넷코드')
    .setDescription('【관리자 전용】 팩션 인트라넷 생성 코드 관리')
    .addSubcommand(sub =>
      sub.setName('발급')
        .setDescription('유저에게 인트라넷 생성 코드를 발급합니다 (관리자 전용)')
        .addUserOption(opt =>
          opt.setName('대상').setDescription('코드를 받을 유저').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('팩션명').setDescription('생성할 팩션 이름').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('취소')
        .setDescription('유저의 미사용 코드를 취소합니다 (관리자 전용)')
        .addUserOption(opt =>
          opt.setName('대상').setDescription('코드를 취소할 유저').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('목록')
        .setDescription('현재 활성화된 코드 목록 조회 (관리자 전용)')
    ),

  // ── /인트라넷 ──────────────────────────────────────
  new SlashCommandBuilder()
    .setName('인트라넷')
    .setDescription('Turn City 인트라넷 관련 명령어')
    .addSubcommand(sub =>
      sub.setName('정보')
        .setDescription('내 팩션 인트라넷 정보 조회')
    ),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('슬래시 커맨드 등록 중...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log('✅ 슬래시 커맨드 등록 완료!');
  } catch (err) {
    console.error('❌ 등록 실패:', err);
  }
})();
