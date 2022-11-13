import { CommandInteraction } from "discord.js";
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption,
} from "discordx";
import fetch from "node-fetch";

import { decode } from "html-entities";

// test query https://yande.re/post.json?limit=1&page=1&tags=order%3Arandom
interface YanderePost {
  id: number;
  tags: string;
  created_at: string;
  score: number;
  width: number;
  height: number;
  md5: string;
  rating: string;
  source?: string;
  author: string;
  file_url: string;
  preview_url: string;
  sample_url: string;
}

interface YandereTag {
  id: number;
  name: string;
  count: number;
  type: number;
  ambiguous: number;
}

interface YanderePostResponse {
  posts: YanderePost[];
}
type YandereTagResponse = YandereTag[];

const YanderePostBase = "https://yande.re/post.json?api_version=2&";
interface YanderePostQuery {
  tags: string;
  limit?: number;
}

const YandereTagBase = "https://yande.re/tag.json?";
interface YandereTagQuery {
  page?: number;
  limit: number;
  after_id?: number;
  name?: string;
  name_pattern?: string;
  order?: string;
}

const yandereQuery = async (
  url: string
): Promise<YanderePostResponse | YandereTagResponse> => {
  const response = await fetch(url);
  const data = await response.text();
  return JSON.parse(data) as YanderePostResponse;
};

const yandereQueryBuilder = (
  baseUrl: string,
  options: YanderePostQuery | YandereTagQuery
): string => {
  const query = Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return baseUrl + query;
};

const getTagData = async (tags: string) => {
  let tagStrings = tags.split(" ");
  return Promise.all(
    tagStrings.map((tag): Promise<YandereTagResponse> => {
      const tagQuery: YandereTagQuery = {
        limit: 5,
        name: `*${tag}*`,
        order: "count",
      };

      const tagQueryUrl = yandereQueryBuilder(YandereTagBase, tagQuery);
      return yandereQuery(tagQueryUrl) as Promise<YandereTagResponse>;
    })
  );
};

const getTagReplyStr = (
  tagData: YandereTagResponse[],
  tags: string
): string => {
  let tagReplyStr = `No results for ${"`"}${tags}${"`"}\n\n`;
  let tagStrings = tags.split(" ");
  tagData.forEach((res, i) => {
    if (res.length > 0 && !res.some((tag) => tagStrings.includes(tag.name))) {
      tagReplyStr += `${"`"}${
        tagStrings[i]
      }${"`"} isn't a known tag did you mean one of these:\n\n`;

      res.forEach((tag) => {
        tagReplyStr += `${"`"}${decode(tag.name)}${"`"} with **${
          tag.count
        }** results\n`;
      });
    } else if (res.length === 0) {
      tagReplyStr += `${"`"}${tagStrings[i]}${"`"} isn't a known tag\n\n`;
    }
    tagReplyStr += "\n";
  });
  return tagReplyStr;
};

const runYandereQuery = async (search: string) => {
  const dataQuery: YanderePostQuery = {
    tags: search
      ? search.split(" ").join("+") + "+order:random"
      : "order:random",
    limit: 1,
  };
  const dataQueryUrl = yandereQueryBuilder(YanderePostBase, dataQuery);
  return (await yandereQuery(dataQueryUrl)) as YanderePostResponse;
};

@Discord()
class yandereCommand {
  @Slash("yd", {
    description: "get a random image yande.re.",
  })
  async yandere(
    @SlashOption("search", {
      description:
        "yande.re search query string. Leave empty for fully random.",
      required: false,
    })
    search: string,
    interaction: CommandInteraction
  ) {
    interaction.deferReply();
    const dataQueryData = await runYandereQuery(search);
    const totalPosts = dataQueryData.posts.length;

    if (totalPosts > 0) {
      let reply = `${dataQueryData.posts[0].file_url}\n`;
      interaction.editReply(reply);
    } else if (search) {
      let tagData = await getTagData(search);
      let tagReplyStr = getTagReplyStr(tagData, search);

      interaction.editReply(tagReplyStr);
    } else {
      interaction.editReply("Something went wrong, sorry!");
    }
  }
  @SimpleCommand("yandere", { aliases: ["yd", "y", "yan"] })
  async yandereSimple(
    @SimpleCommandOption("search", { type: "STRING" })
    search: string | undefined,
    command: SimpleCommandMessage
  ) {
    // pre-processing to get input
    search = command.message.content.split(" ").splice(1).join(" ");

    if (!search) search = "";
    const dataQueryData = await runYandereQuery(search);
    const totalPosts = dataQueryData.posts.length;

    if (totalPosts > 0) {
      let reply = `${dataQueryData.posts[0].file_url}\n`;
      return command.message.reply(reply);
    } else if (search) {
      let tagData = await getTagData(search);
      let tagReplyStr = getTagReplyStr(tagData, search);

      return command.message.reply(tagReplyStr);
    } else {
      return command.message.reply("Something went wrong, sorry!");
    }
  }
}
