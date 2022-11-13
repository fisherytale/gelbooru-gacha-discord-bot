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
// import xml2js from "xml2js";

// import { decode } from "html-entities";

// interface R34Post {
//   id: number;
//   tags: string;
//   created_at: string;
//   score: number;
//   width: number;
//   height: number;
//   md5: string;
//   rating: string;
//   source?: string;
//   author: string;
//   file_url: string;
//   preview_url: string;
//   sample_url: string;
// }

// interface R34Tag {
//   id: [number];
//   name: [string];
//   count: [number];
//   type: [number];
//   ambiguous: [number];
// }

// interface R34PostResponse {
//   posts: {
//     count: [number];
//     offset: [number];
//     post: R34Post[];
//   };
// }
// type R34TagResponse = {
//   tags: {
//     type: [string];
//     tag: R34Tag[];
//   };
// };

// const R34PostBase =
//   "https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&";
// interface R34PostQuery {
//   tags: string;
//   pid: number;
//   limit: 1 | 0;
// }

// const R34TagBase = "https://api.rule34.xxx/index.php?page=dapi&s=tag&q=index&";
// //https://api.rule34.xxx/index.php?page=dapi&s=tag&q=index&order=count&direction=desc&name_pattern=diona
// interface R34TagQuery {
//   page?: number;
//   limit: number;
//   after_id?: number;
//   name?: string;
//   name_pattern?: string;
//   order?: string;
//   direction?: "asc" | "desc";
// }

// const r34Query = async (
//   url: string
// ): Promise<R34PostResponse | R34TagResponse> => {
//   const response = await fetch(url);
//   const data = await response.text();
//   return xml2js.parseStringPromise(data, { mergeAttrs: true });
// };

// const r34QueryBuilder = (
//   baseUrl: string,
//   options: R34PostQuery | R34TagQuery
// ): string => {
//   const query = Object.entries(options)
//     .map(([key, value]) => `${key}=${value}`)
//     .join("&");
//   return baseUrl + query;
// };

// const getTagData = async (tags: string) => {
//   let tagStrings = tags.split(" ");
//   return Promise.all(
//     tagStrings.map((tag): Promise<R34TagResponse> => {
//       const tagQuery: R34TagQuery = {
//         name_pattern: `${tag}`,
//         order: "count",
//         direction: "desc",
//         limit: 5,
//       };

//       const tagQueryUrl = r34QueryBuilder(R34TagBase, tagQuery);
//       return r34Query(tagQueryUrl) as Promise<R34TagResponse>;
//     })
//   );
// };

// const getTagReplyStr = (tagData: R34TagResponse[], tags: string): string => {
//   let tagReplyStr = `No results for ${"`"}${tags}${"`"}\n\n`;
//   let tagStrings = tags.split(" ");
//   tagData.forEach((res, i) => {
//     if (
//       res.tags.tag.length > 0 &&
//       !res.tags.tag.some((tag) => tagStrings.includes(tag.name[0]))
//     ) {
//       tagReplyStr += `${"`"}${
//         tagStrings[i]
//       }${"`"} isn't a known tag did you mean one of these:\n\n`;

//       res.tags.tag.forEach((tag) => {
//         tagReplyStr += `${"`"}${decode(tag.name[0])}${"`"} with **${
//           tag.count
//         }** results\n`;
//       });
//     } else if (res.tags.tag.length === 0) {
//       tagReplyStr += `${"`"}${tagStrings[i]}${"`"} isn't a known tag\n\n`;
//     }
//     tagReplyStr += "\n";
//   });
//   return tagReplyStr;
// };

// const runR34Query = async (search: string, pid: number, limit: 0 | 1) => {
//   const dataQuery: R34PostQuery = {
//     tags: search.split(" ").join("+"),
//     pid: pid,
//     limit: limit,
//   };
//   const dataQueryUrl = r34QueryBuilder(R34PostBase, dataQuery);
//   return (await r34Query(dataQueryUrl)) as R34PostResponse;
// };

// @Discord()
// class r34Command {
//   @Slash("r34", {
//     description: "get a random image from rule34.xxx",
//   })
//   async rule34(
//     @SlashOption("search", {
//       description:
//         "rule34.xxx search query string. Leave empty for fully random.",
//       required: false,
//     })
//     search: string,
//     interaction: CommandInteraction
//   ) {
//     interaction.deferReply();

//     const sizeQueryData = await runR34Query(search, 0, 0);
//     const totalPosts = sizeQueryData.posts.count[0];

//     if (totalPosts > 0) {
//       const dataQueryData = await runR34Query(
//         search,
//         Math.floor(Math.random() * (totalPosts - 1)),
//         1
//       );
//       if (dataQueryData.response?.success[0] == "false")
//         return interaction.editReply(
//           "This bot's used R34 too much, please try again later."
//         );
//       let reply = `${dataQueryData.posts.post[0].file_url}\n`;
//       interaction.editReply(reply);
//     } else if (search) {
//       let tagData = await getTagData(search);
//       let tagReplyStr = getTagReplyStr(tagData, search);

//       interaction.editReply(tagReplyStr);
//     } else {
//       interaction.editReply("Something went wrong, sorry!");
//     }
//   }
//   @SimpleCommand("rule34", { aliases: ["r34"] })
//   async rule34Simple(
//     @SimpleCommandOption("search", { type: "STRING" })
//     search: string | undefined,
//     command: SimpleCommandMessage
//   ) {
//     // pre-processing to get input
//     search = command.message.content.split(" ").splice(1).join(" ");

//     if (!search) search = "";
//     const sizeQueryData = await runR34Query(search, 0, 0);
//     const totalPosts = sizeQueryData.posts.count[0];

//     if (totalPosts > 0) {
//       const dataQueryData = await runR34Query(
//         search,
//         Math.floor(Math.random() * (totalPosts - 1)),
//         1
//       );
//       if (dataQueryData.response?.success[0] == "false")
//         return command.message.reply(
//           "This bot's used R34 too much, please try again later."
//         );
//       let reply = `${dataQueryData.posts.post[0].file_url}\n`;
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
