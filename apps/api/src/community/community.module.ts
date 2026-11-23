import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Vote, VoteSchema } from './schemas/vote.schema';
import { Report, ReportSchema } from './schemas/report.schema';
import { CommentsService } from './comments.service';
import { ReportsService } from './reports.service';
import { CommunityController } from './community.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  providers: [CommentsService, ReportsService],
  controllers: [CommunityController],
  exports: [CommentsService, ReportsService],
})
export class CommunityModule {}
