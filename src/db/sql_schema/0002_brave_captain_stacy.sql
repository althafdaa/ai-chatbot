CREATE TABLE IF NOT EXISTS "messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"role" varchar(255) NOT NULL,
	"chat_id" serial NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
