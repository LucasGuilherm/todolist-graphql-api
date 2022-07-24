// Firebase
import admin from "firebase-admin";
// import serviceAccount from "../firebase-account.json" assert { type: "json" };\
import dotenv from "dotenv";
dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Apollo Server
import {
  ApolloServer,
  ApolloError,
  ValidationError,
  gql,
  UserInputError,
} from "apollo-server";
import { format } from "date-fns";

const typeDefs = gql`
  type Item {
    itemId: ID
    tittle: String
    description: String
    isCompleted: Boolean
    creationDate: String
  }

  type Query {
    items(isCompleted: Boolean, tittle: String): [Item]
  }

  input Filter {
    tittle: String
    description: String
    isCompleted: Boolean
  }

  type Mutation {
    createItem(itemProps: Filter): Item
    deleteItem(itemId: ID): String
  }
`;

const resolvers = {
  Query: {
    async items(_, { isCompleted, tittle }) {
      const itemsRef = admin.firestore().collection("items");

      let items = itemsRef;

      if (typeof isCompleted != "undefined") {
        items = items.where("isCompleted", "==", isCompleted);
      }

      if (typeof tittle != "undefined") {
        items = items.where("tittle", "==", tittle);
      }

      items = await items.get();
      return items.docs.map((item) => {
        let itemNew = item.data();

        itemNew.itemId = item.id;
        itemNew.creationDate = itemNew.creationDate.toDate();

        return itemNew;
      });
    },
  },
  Mutation: {
    async createItem(_, { itemProps }) {
      const itemsRef = admin.firestore().collection("items");

      Object.assign(itemProps, {
        creationDate: admin.firestore.Timestamp.fromDate(new Date()).toDate(),
      });

      try {
        const createdId = await itemsRef.add(itemProps);

        Object.assign(itemProps, { itemId: createdId.id });
      } catch (error) {
        throw new UserInputError(error);
      }

      return itemProps;
    },
    async deleteItem(_, { itemId }) {
      const itemsRef = admin.firestore().collection("items");

      try {
        await itemsRef.doc(itemId).delete();
      } catch (error) {
        throw new ApolloError(error.message);
      }

      return `Item ${itemId} deletado com sucesso!`;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  cache: "bounded",
  introspection: true,
  playground: true,
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
