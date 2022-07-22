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

const typeDefs = gql`
  type Item {
    tittle: String
    description: String
    isCompleted: Boolean
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
      return items.docs.map((item) => item.data());
    },
  },
  Mutation: {
    async createItem(_, { itemProps }) {
      const itemsRef = admin.firestore().collection("items");

      try {
        await itemsRef.add(itemProps);
      } catch (error) {
        throw new UserInputError(error);
      }

      return itemProps;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  cache: "bounded",
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
