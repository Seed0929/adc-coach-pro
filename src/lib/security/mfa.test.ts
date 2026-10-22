import { beforeEach, describe, expect, it, vi } from "vitest";
const provider = vi.hoisted(() => ({listFactors:vi.fn(),getAuthenticatorAssuranceLevel:vi.fn(),enroll:vi.fn(),unenroll:vi.fn(),challengeAndVerify:vi.fn(),refreshSession:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:{mfa:provider,refreshSession:provider.refreshSession}}}));
import { readMfaStatus, cancelMfaEnrollment, disableTotpFactor, startTotpEnrollment, verifyTotpEnrollment } from "./mfa";
function factors(status="verified") { provider.listFactors.mockResolvedValue({data:{all:[{id:"factor-a",factor_type:"totp",status}]},error:null}); }
beforeEach(()=>{vi.resetAllMocks(); provider.listFactors.mockResolvedValue({data:{all:[]},error:null});provider.getAuthenticatorAssuranceLevel.mockResolvedValue({data:{currentLevel:"aal1",nextLevel:"aal1"},error:null}); provider.unenroll.mockResolvedValue({error:null}); provider.refreshSession.mockResolvedValue({error:null});});
describe("optional native TOTP",()=>{
 it("no enrollment allows aal1",async()=>{expect(await readMfaStatus()).toMatchObject({known:true,enabled:false,challengeRequired:false});});
 it("verified enrollment requires aal2 even if provider next level is stale",async()=>{factors();expect(await readMfaStatus()).toMatchObject({enabled:true,challengeRequired:true,nextLevel:"aal2"});});
 it("provider error leaves status unknown",async()=>{provider.listFactors.mockResolvedValue({data:null,error:{message:"unavailable"}});expect((await readMfaStatus()).known).toBe(false);});
 it("aal2 clears challenge",async()=>{factors();provider.getAuthenticatorAssuranceLevel.mockResolvedValue({data:{currentLevel:"aal2",nextLevel:"aal2"},error:null});expect((await readMfaStatus()).challengeRequired).toBe(false);});
 it("cancel cannot remove a verified factor",async()=>{factors();expect((await cancelMfaEnrollment("factor-a")).error).toBeTruthy();expect(provider.unenroll).not.toHaveBeenCalled();});
 it("cancel removes only the requested unverified TOTP",async()=>{factors("unverified");expect((await cancelMfaEnrollment("factor-a")).error).toBeNull();expect(provider.unenroll).toHaveBeenCalledWith({factorId:"factor-a"});});
 it("invalid native code cannot remove protection",async()=>{factors();provider.challengeAndVerify.mockResolvedValue({error:{message:"expired"}});expect((await disableTotpFactor("factor-a","123456")).error).toBeTruthy();expect(provider.unenroll).not.toHaveBeenCalled();});
 it("successful fresh verification removes exactly one factor then refreshes",async()=>{factors();provider.challengeAndVerify.mockResolvedValue({error:null});expect((await disableTotpFactor("factor-a","123456")).error).toBeNull();expect(provider.challengeAndVerify).toHaveBeenCalledWith({factorId:"factor-a",code:"123456"});expect(provider.unenroll).toHaveBeenCalledWith({factorId:"factor-a"});expect(provider.refreshSession).toHaveBeenCalledOnce();});
 it("setup never removes an existing verified factor",async()=>{factors();expect((await startTotpEnrollment()).error).toBeTruthy();expect(provider.unenroll).not.toHaveBeenCalled();expect(provider.enroll).not.toHaveBeenCalled();});
 it("wrong enrollment code never enables a factor",async()=>{provider.challengeAndVerify.mockResolvedValue({error:{message:"invalid"}});expect((await verifyTotpEnrollment("new-factor","123456")).error).toBeTruthy();expect(provider.enroll).not.toHaveBeenCalled();});
});
