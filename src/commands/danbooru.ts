// import { CommandInteraction } from "discord.js";
// import {
//   Discord,
//   SimpleCommand,
//   SimpleCommandMessage,
//   SimpleCommandOption,
//   Slash,
//   SlashOption,
// } from "discordx";
// import fetch from "node-fetch";

// import { decode } from "html-entities";

// interface DanbooruPost {
//   id: number;
//   created_at: string;
//   uploader_id: number;
//   score: number;
//   source: string;
//   md5: string;
//   last_comment_bumped_at: string;
//   rating: "q" | "e" | "s";
//   image_width: number;
//   image_height: number;
//   tag_string: string;
//   is_note_locked: boolean;
//   fav_count: number;
//   file_ext: string;
//   last_noted_at: string | null;
//   is_rating_locked: boolean;
//   parent_id: number | null;
//   has_children: boolean;
//   approver_id: number;
//   tag_count_general: number;
//   tag_count_artist: number;
//   tag_count_character: number;
//   tag_count_copyright: number;
//   file_size: number;
//   is_status_locked: boolean;
//   fav_string: string;
//   pool_string: string;
//   up_score: number;
//   down_score: number;
//   is_pending: boolean;
//   is_flagged: boolean;
//   is_deleted: boolean;
//   tag_count: number;
//   updated_at: string;
//   is_banned: boolean;
//   pixiv_id: string | null;
//   last_commented_at: string;
//   has_active_children: boolean;
//   bit_flags: number;
//   tag_count_meta: number;
//   has_large: boolean;
//   has_visible_children: boolean;
//   tag_string_general: string;
//   tag_string_character: string;
//   tag_string_copyright: string;
//   tag_string_artist: string;
//   tag_string_meta: string;
//   file_url: string;
//   large_file_url: string;
//   preview_file_url: string;
// }

// interface DanbooruTag {
//   id: number;
//   name: string;
//   post_count: number;
//   category: number;
//   created_at: string;
//   updated_at: string;
//   is_locked: boolean;
// }

// type DanbooruPostResponse = DanbooruPost[];
// type DanbooruTagResponse = DanbooruTag[];

// const DanbooruPostBase = "/posts.json?";
// interface DanbooruPostQuery {
//   limit: 1;
//   tags?: string;
//   random: true;
// }

// const DanbooruTagBase = "/tags.json?";
// interface DanbooruTagQuery {
//   limit: 5;
//   "search[name_or_alias_matches]": string;
//   "search[order]": "count";
// }

// const danbooruQuery = async (
//   url: string
// ): Promise<DanbooruPostResponse | DanbooruTagResponse> => {
//   const response = await fetch(url);
//   const data = await response.text();
//   return JSON.parse(data);
// };

// const danbooruQueryBuilder = (
//   baseUrl: string,
//   options: DanbooruPostQuery | DanbooruTagQuery
// ): string => {
//   const query = Object.entries(options)
//     .map(([key, value]) => `${key}=${value}`)
//     .join("&");

//   return `https://danbooru.donmai.us` + baseUrl + query;
// };

// const getTagData = async (tags: string) => {
//   let tagStrings = tags.split(" ");
//   return Promise.all(
//     tagStrings.map((tag): Promise<DanbooruTagResponse> => {
//       const tagQuery: DanbooruTagQuery = {
//         limit: 5,
//         "search[name_or_alias_matches]": `*${tag}*`,
//         "search[order]": "count",
//       };

//       const tagQueryUrl = danbooruQueryBuilder(DanbooruTagBase, tagQuery);
//       return danbooruQuery(tagQueryUrl) as Promise<DanbooruTagResponse>;
//     })
//   );
// };

// const getTagReplyStr = (
//   tagData: DanbooruTagResponse[],
//   tags: string
// ): string => {
//   let tagReplyStr = `No results for ${"`"}${tags}${"`"}\n\n`;
//   let tagStrings = tags.split(" ");
//   tagData.forEach((res, i) => {
//     if (res.length > 0 && !res.some((tag) => tagStrings.includes(tag.name))) {
//       tagReplyStr += `${"`"}${
//         tagStrings[i]
//       }${"`"} isn't a known tag did you mean one of these:\n\n`;

//       res.forEach((tag) => {
//         tagReplyStr += `${"`"}${decode(tag.name)}${"`"} with **${
//           tag.post_count
//         }** results\n`;
//       });
//     } else if (res.length === 0) {
//       tagReplyStr += `${"`"}${tagStrings[i]}${"`"} isn't a known tag\n\n`;
//     }
//     tagReplyStr += "\n";
//   });
//   return tagReplyStr;
// };

// const runDanbooruQuery = async (search: string) => {
//   const dataQuery: DanbooruPostQuery = {
//     tags: search ? search.split(" ").join("+") : "",
//     limit: 1,
//     random: true,
//   };
//   const dataQueryUrl = danbooruQueryBuilder(DanbooruPostBase, dataQuery);
//   return (await danbooruQuery(dataQueryUrl)) as DanbooruPostResponse;
// };

// interface IsValidDanbooruSearch {
//   valid: boolean;
//   message: string;
// }
// const isValidDanbooruSearch = (search: string): IsValidDanbooruSearch => {
//   if (search.split(" ").length > 1) {
//     return {
//       valid: false,
//       message:
//         "You can only search for one tag on danbooru when getting a random image. :(",
//     };
//   } else {
//     return {
//       valid: true,
//       message: "",
//     };
//   }
// };

// @Discord()
// class danbooruCommand {
//   @Slash("db", {
//     description: "get a random image from danbooru.donmai.us",
//   })
//   async danbooru(
//     @SlashOption("search", {
//       description:
//         "danbooru.com search query string. Leave empty for fully random.",
//       required: false,
//     })
//     search: string,
//     interaction: CommandInteraction
//   ) {
//     let isValid = isValidDanbooruSearch(search);
//     if (!isValid.valid) interaction.reply(isValid.message);

//     interaction.deferReply();
//     const dataQueryData = await runDanbooruQuery(search);
//     const totalPosts = dataQueryData.length;

//     if (totalPosts > 0) {
//       let reply = `${dataQueryData[0].file_url}\n`;
//       interaction.editReply(reply);
//     } else if (search) {
//       let tagData = await getTagData(search);
//       let tagReplyStr = getTagReplyStr(tagData, search);

//       interaction.editReply(tagReplyStr);
//     } else {
//       interaction.editReply("Something went wrong, sorry!");
//     }
//   }
//   @SimpleCommand("danbooru", { aliases: ["db"] })
//   async danbooruSimple(
//     @SimpleCommandOption("search", { type: "STRING" })
//     search: string | undefined,
//     command: SimpleCommandMessage
//   ) {
//     // pre-processing to get input
//     search = command.message.content.split(" ").splice(1).join(" ");

//     let isValid = isValidDanbooruSearch(search);
//     if (!isValid.valid) return command.message.reply(isValid.message);

//     if (!search) search = "";
//     const dataQueryData = await runDanbooruQuery(search);
//     const totalPosts = dataQueryData.length;

//     if (totalPosts > 0) {
//       let reply = `${dataQueryData[0].file_url}\n`;
//       return command.message.reply(reply);
//     } else if (search) {
//       let tagData = await getTagData(search);
//       let tagReplyStr = getTagReplyStr(tagData, search);

//       return command.message.reply(tagReplyStr);
//     } else {
//       return command.message.reply("Something went wrong, sorry!");
//     }
//   }
// }
