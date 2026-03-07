import { IsUUID } from 'class-validator';

export class AddBoardMemberDto {
  @IsUUID()
  workspaceMemberId!: string;
}
