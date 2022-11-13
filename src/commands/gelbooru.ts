import {
  ButtonInteraction,
  CommandInteraction,
  MessageActionRow,
  MessageButton,
} from "discord.js";
import { ButtonComponent, Discord, On, Slash, SlashOption } from "discordx";
import fetch from "node-fetch";
import { decode } from "html-entities";

const SEARCH_TAG_PREFIX = "search-tag____";
const MINIMUM_RESULTS = 50;

interface GelbooruGlobalData {
  limit: number;
  offset: number;
  count: number;
}
interface GelbooruPost {
  id: number;
  created_at: string;
  score: number;
  width: number;
  height: number;
  md5: string;
  directory: string;
  image: string;
  rating: string;
  source?: string;
  change: string;
  owner: string;
  creator_id: number;
  parent_id?: number;
  sample: number;
  preview_height: number;
  preview_width: number;
  tags: string;
  title?: string;
  has_notes: boolean;
  has_comments: boolean;
  file_url: string;
  preview_url: string;
  sample_url: string;
  sample_height: number;
  sample_width: number;
  status: string;
  post_locked: number | boolean;
  has_children: boolean;
}

interface GelbooruTag {
  id: number;
  name: string;
  count: number;
  type: number;
  ambiguous: number;
}

interface GelbooruPostResponse {
  "@attributes": GelbooruGlobalData;
  post: GelbooruPost[];
}

interface GelbooruTagResponse {
  "@attributes": GelbooruGlobalData;
  tag: GelbooruTag[];
}

interface CustomGelbooruTagResponse {
  related: GelbooruTagResponse;
  exists: GelbooruPostResponse;
}

interface GelbooruQuery {
  api_key: string;
  user_id: string;
}
interface GelbooruPostQuery extends GelbooruQuery {
  page: "dapi";
  s: "post";
  q: "index";
  limit?: number;
  pid?: number;
  tags?: string;
  cid?: number;
  id?: number;
  json: 1;
}

interface GelbooruTagQuery extends GelbooruQuery {
  page: "dapi";
  s: "tag";
  q: "index";
  limit?: number;
  after_id?: number;
  name?: string;
  name_pattern?: string;
  json: 1;
  order?: string;
  orderby?: string;
}

const gelbooruQuery = async (
  url: string
): Promise<GelbooruPostResponse | GelbooruTagResponse> => {
  const response = await fetch(url);
  const data = await response.text();
  return JSON.parse(data) as GelbooruPostResponse;
};

const gelbooruQueryBuilder = (
  options: GelbooruPostQuery | GelbooruTagQuery
): string => {
  const query = Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `https://gelbooru.com/index.php?${query}`;
};

const getTagData = async (tags: string) => {
  let tagStrings = tags.split(" ");
  return Promise.all(
    tagStrings.map((tag) => {
      const tagSearchQuery: GelbooruTagQuery = {
        api_key: process.env.GELBOORU_API_KEY ?? "",
        user_id: process.env.GELBOORU_USER_ID ?? "",
        page: "dapi",
        s: "tag",
        q: "index",
        limit: 5,
        json: 1,
        name_pattern: `%${tag}%`,
        orderby: "count",
      };

      const tagQuery: GelbooruPostQuery = {
        api_key: process.env.GELBOORU_API_KEY ?? "",
        user_id: process.env.GELBOORU_USER_ID ?? "",
        page: "dapi",
        s: "post",
        q: "index",
        limit: 0,
        json: 1,
        tags: tag,
        pid: 0,
      };

      const tagSearchQueryUrl = gelbooruQueryBuilder(tagSearchQuery);
      const tagQueryUrl = gelbooruQueryBuilder(tagQuery);

      const relatedResults = gelbooruQuery(
        tagSearchQueryUrl
      ) as Promise<GelbooruTagResponse>;

      const existsResults = gelbooruQuery(
        tagQueryUrl
      ) as Promise<GelbooruPostResponse>;

      return Promise.all([relatedResults, existsResults]).then(
        ([related, exists]) => {
          return { related, exists };
        }
      );
    })
  );
};

const getTagReplyStr = (
  tagData: CustomGelbooruTagResponse[],
  tags: string,
  inline = false
): string => {
  let tagReplyStr = inline ? "" : `No results for ${"`"}${tags}${"`"}\n\n`;
  let tagStrings = tags.split(" ");
  tagData.forEach((res, i) => {
    let searchCount =
      (res.exists["@attributes"] && res.exists["@attributes"].count) || 0;

    if (searchCount > 0) {
      tagReplyStr += `${"`"}${
        tagStrings[i]
      }${"`"} has **${searchCount}** results\n`;
    } else {
      tagReplyStr += `${"`"}${tagStrings[i]}${"`"} isn't a known tag\n`;
    }

    if (
      res.related["@attributes"]?.count > 0 &&
      res.related.tag[0].count > searchCount
    ) {
      tagReplyStr += "Did you mean one of these:\n\n";

      res.related.tag.forEach((tag) => {
        if (tag.count > 0 && !tagStrings.includes(tag.name)) {
          tagReplyStr += `${"`"}${decode(tag.name)}${"`"} with **${
            tag.count
          }** results\n`;
        }
      });
    }
    tagReplyStr += "\n";
  });
  return tagReplyStr;
};

const runGelbooruQuery = async (search: string) => {
  const dataQuery: GelbooruPostQuery = {
    page: "dapi",
    s: "post",
    q: "index",
    api_key: process.env.GELBOORU_API_KEY ?? "",
    user_id: process.env.GELBOORU_USER_ID ?? "",
    tags: search ? search.split(" ").join("+") + "+sort:random" : "sort:random",
    limit: 1,
    pid: 0,
    json: 1,
  };
  const dataQueryUrl = gelbooruQueryBuilder(dataQuery);
  return (await gelbooruQuery(dataQueryUrl)) as GelbooruPostResponse;
};

const getTagsReply = async (search: string, inline = false) => {
  let tagData = await getTagData(search);
  let tagReplyStr = getTagReplyStr(tagData, search, inline);
  let components = tagData
    .map((data) => {
      return data.related.tag &&
        data.exists["@attributes"].count < data.related.tag[0].count
        ? new MessageActionRow().addComponents(
            data.related.tag
              .map((tag, i) => {
                if (!search.includes(tag.name) && tag.count > 0) {
                  const tagButton = new MessageButton()
                    .setLabel(decode(tag.name))
                    .setEmoji("🔎")
                    .setStyle("PRIMARY")
                    .setCustomId(SEARCH_TAG_PREFIX + tag.name);
                  return tagButton;
                }
              })
              .filter((button) => button != null) as MessageButton[]
          )
        : null;
    })
    .filter((row) => row !== null && row.components.length > 0);
  return components.length > 0
    ? { content: tagReplyStr, components }
    : tagReplyStr;
};

const getReply = async (
  dataQueryData: GelbooruPostResponse,
  search: string,
  totalPosts: number
) => {
  if (totalPosts > 0) {
    let reply = `${dataQueryData.post[0].file_url}\n`;
    let tagComponents = new Array<MessageActionRow>();

    if (search) reply += `**${totalPosts}** results for ${"`"}${search}${"`"}`;
    if (totalPosts < MINIMUM_RESULTS && search.split(" ").length === 1) {
      let tagsReply = await getTagsReply(search, true);
      // @ts-ignore
      if (tagsReply.content && tagsReply.components) {
        // @ts-ignore
        reply += `\n` + tagsReply.content;
        // @ts-ignore
        tagComponents = tagsReply.components;
      } else {
        reply += `\n` + tagsReply;
      }
    }

    const replaceButton = new MessageButton()
      .setLabel("Replace")
      .setEmoji("🙈")
      .setStyle("SECONDARY")
      .setCustomId("replace-btn");

    const randomButton = new MessageButton()
      .setLabel("Reroll")
      .setEmoji("🎲")
      .setStyle("PRIMARY")
      .setCustomId("reroll-btn");

    const purgeButton = new MessageButton()
      .setEmoji("🗑️")
      .setStyle("DANGER")
      .setCustomId("purge-btn");

    const row = new MessageActionRow().addComponents(
      replaceButton,
      randomButton,
      purgeButton
    );
    return { content: reply, components: [row, ...tagComponents] };
  } else if (search) return getTagsReply(search);
  else {
    return "Something went wrong, sorry!";
  }
};

const searchFromMessage = (message: string): string => {
  let search = message.split("`");
  return search.length > 1 ? search[1] : "";
};

@Discord()
class gelbooruCommand {
  @Slash("gb", {
    description: "get a random image gelbooru.com.",
  })
  async gelbooru(
    @SlashOption("search", {
      description:
        "gelbooru.com search query string. Leave empty for fully random.",
      required: false,
    })
    search: string,
    interaction: CommandInteraction
  ) {
    try {
      await interaction.deferReply();
      const dataQueryData = await runGelbooruQuery(search);
      const totalPosts = dataQueryData["@attributes"].count;
      await interaction.editReply(
        await getReply(dataQueryData, search, totalPosts)
      );
    } catch (e) {
      console.log(e);
      interaction.editReply("Something went wrong, please try again!");
    }
  }
  @ButtonComponent("replace-btn")
  async replace(interaction: ButtonInteraction) {
    try {
      await interaction.deferReply();
      const search = searchFromMessage(interaction.message.content);
      const dataQueryData = await runGelbooruQuery(search);
      const totalPosts = dataQueryData["@attributes"].count;
      const reply = await getReply(dataQueryData, search, totalPosts);
      interaction.deleteReply();
      interaction.message.edit(reply);
    } catch (e) {
      interaction.editReply("Something went wrong, please try again!");
    }
  }
  @ButtonComponent("reroll-btn")
  async reroll(interaction: ButtonInteraction) {
    try {
      await interaction.deferReply();
      const search = searchFromMessage(interaction.message.content);
      const dataQueryData = await runGelbooruQuery(search);
      const totalPosts = dataQueryData["@attributes"].count;
      const reply = await getReply(dataQueryData, search, totalPosts);
      interaction.editReply(reply);
    } catch (e) {
      console.log(e);
      interaction.editReply("Something went wrong, please try again!");
    }
  }
  @ButtonComponent("purge-btn")
  async purge(interaction: ButtonInteraction) {
    try {
      await interaction.deferReply();
      await interaction.message.delete();
      interaction.deleteReply();
    } catch (e) {
      console.log(e);
      interaction.editReply("Something went wrong, sorry!");
    }
  }

  @On("interactionCreate")
  async onClick(interactions: ButtonInteraction[]) {
    let interaction = interactions[0];
    if (interaction?.customId?.includes(SEARCH_TAG_PREFIX)) {
      try {
        await interaction.deferReply();
        const tag = interaction.customId.substring(SEARCH_TAG_PREFIX.length);
        const dataQueryData = await runGelbooruQuery(tag);
        const totalPosts = dataQueryData["@attributes"].count;
        interaction.editReply(await getReply(dataQueryData, tag, totalPosts));
      } catch (e) {
        console.log(e);
        interaction.editReply("Something went wrong, please try again!");
      }
    }
  }
}
